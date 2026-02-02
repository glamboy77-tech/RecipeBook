import fs from "fs";
import path from "path";
import sharp from "sharp";
import fetch from "node-fetch";

const ROOT = process.cwd();
const RECIPES_DIR = path.join(ROOT, "public", "recipes");
const IMAGES_DIR = path.join(RECIPES_DIR, "images");

const IMAGE_EXTS = ["png", "webp", "jpg", "jpeg"];
const MAX_BYTES = 2 * 1024 * 1024;
const RESIZE_STEPS = [1600, 1200, 1000];

const RESULTS_SAMPLE_SIZE = 5;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function hasExistingImage(recipe) {
  if (recipe?.image) {
    if (typeof recipe.image === "string") {
      return !isBlank(recipe.image);
    }
    if (typeof recipe.image === "object") {
      return !isBlank(recipe.image?.src);
    }
  }

  if (recipe?.imagePath && !isBlank(recipe.imagePath)) {
    return true;
  }

  return false;
}

function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function keepTrailingNewline(original, text) {
  const hasTrailing = /\r?\n$/.test(original);
  return hasTrailing ? `${text}\n` : text;
}

function normalizeForPath(name) {
  return name.replace(/\.json$/i, "");
}

function buildImageCandidates(stem) {
  return IMAGE_EXTS.map((ext) => path.join(IMAGES_DIR, `${stem}.${ext}`));
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

function cleanTitle(raw) {
  if (!raw) return "";
  let text = String(raw).trim();
  if (!text) return "";

  // 괄호 안 제거: "감자샐러드(100인분)" -> "감자샐러드"
  text = text.replace(/\s*\([^)]*\)\s*/g, " ");

  // 구분자/특수문자는 공백으로
  text = text.replace(/[\/+&:;·ㆍ,_-]+/g, " ");

  // 연속 공백 정리
  text = text.replace(/\s{2,}/g, " ").trim();

  return text;
}

function toQueries(title) {
  const cleaned = cleanTitle(title);
  if (!cleaned) return [];
  return [cleaned, `${cleaned} food`];
}

function scoreResult(result) {
  let score = 0;

  const license = result?.license;
  const licenseUrl = result?.license_url;
  const sourceUrl = result?.source;
  const creator = result?.creator;
  const url = result?.url;

  if (license) score += 3;
  if (licenseUrl) score += 2;
  if (sourceUrl) score += 2;
  if (creator) score += 1;
  if (url) score += 1;

  const width = Number(result?.width);
  const height = Number(result?.height);
  if (Number.isFinite(width) && Number.isFinite(height) && height > 0) {
    const ratio = width / height;
    if (ratio >= 0.45 && ratio <= 2.2) {
      score += 4;
    } else {
      score -= 3;
    }
  }

  return score;
}

function selectBestResult(results) {
  const filtered = (results || []).filter((item) => item?.license && item?.license_url && item?.source && item?.creator);
  if (filtered.length === 0) return null;
  return filtered.sort((a, b) => scoreResult(b) - scoreResult(a))[0] || null;
}

async function searchOpenverse(title) {
  const attempts = toQueries(title);

  for (const query of attempts) {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&per_page=20`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Openverse API failed (${res.status})`);
    }
    const data = await res.json();
    const best = selectBestResult(data?.results || []);
    if (best) {
      return { result: best, query };
    }
  }

  return { result: null, query: attempts.at(-1) || "" };
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function ensurePngUnderLimit(buffer, targetPath) {
  let lastError = null;
  for (const size of RESIZE_STEPS) {
    try {
      const output = await sharp(buffer)
        .rotate()
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      if (output.length <= MAX_BYTES) {
        fs.writeFileSync(targetPath, output);
        return output.length;
      }

      lastError = new Error(`PNG exceeds limit after resize ${size}px (${output.length} bytes)`);
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("PNG conversion failed");
}

function buildImageCredit(result) {
  return {
    provider: "openverse",
    sourceUrl: result?.source || result?.url || "",
    creator: result?.creator || "",
    license: result?.license || "",
    licenseUrl: result?.license_url || "",
  };
}

function updateRecipeJson({ filePath, rawText, recipe, imagePath, credit }) {
  const eol = detectEol(rawText);
  const updated = {
    ...recipe,
    image: imagePath,
    imageCredit: credit,
  };
  const jsonText = JSON.stringify(updated, null, 2).split("\n").join(eol);
  const finalText = keepTrailingNewline(rawText, jsonText);
  fs.writeFileSync(filePath, finalText, "utf8");
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(RECIPES_DIR).filter((file) => file.endsWith(".json") && file !== "index.json");

  let total = entries.length;
  let targetCount = 0;
  let success = 0;
  const failures = {
    noResults: 0,
    download: 0,
    transform: 0,
    write: 0,
  };
  const sample = [];

  for (const filename of entries) {
    const filePath = path.join(RECIPES_DIR, filename);
    const rawText = fs.readFileSync(filePath, "utf8");

    let recipe;
    try {
      recipe = JSON.parse(rawText);
    } catch (err) {
      console.warn(`[skip] JSON parse failed: ${filename}`);
      continue;
    }

    if (hasExistingImage(recipe)) {
      continue;
    }

    const stem = normalizeForPath(filename);
    const candidates = buildImageCandidates(stem);
    const alreadyExists = candidates.some((candidate) => fileExists(candidate));
    if (alreadyExists) {
      continue;
    }

    targetCount += 1;

    const title = recipe?.title || stem;
    let search;
    try {
      search = await searchOpenverse(title);
    } catch (err) {
      console.warn(`[fail] Openverse search error: ${title} (${err.message})`);
      failures.noResults += 1;
      continue;
    }

    if (!search?.result) {
      console.warn(`[fail] Openverse no results: ${title}`);
      failures.noResults += 1;
      continue;
    }

    const imageUrl = search.result.url || search.result.thumbnail;
    if (!imageUrl) {
      console.warn(`[fail] Openverse missing image url: ${title}`);
      failures.noResults += 1;
      continue;
    }

    const outputPath = path.join(IMAGES_DIR, `${stem}.png`);
    if (fileExists(outputPath)) {
      continue;
    }

    let buffer;
    try {
      buffer = await downloadImage(imageUrl);
    } catch (err) {
      console.warn(`[fail] Download failed: ${title} (${err.message})`);
      failures.download += 1;
      continue;
    }

    try {
      await ensurePngUnderLimit(buffer, outputPath);
    } catch (err) {
      console.warn(`[fail] Image transform failed: ${title} (${err.message})`);
      failures.transform += 1;
      continue;
    }

    const imagePath = `/recipes/images/${stem}.png`;
    const credit = buildImageCredit(search.result);

    try {
      updateRecipeJson({ filePath, rawText, recipe, imagePath, credit });
    } catch (err) {
      console.warn(`[fail] JSON write failed: ${title} (${err.message})`);
      failures.write += 1;
      continue;
    }

    success += 1;
    if (sample.length < RESULTS_SAMPLE_SIZE) {
      sample.push({ title, image: imagePath, license: credit.license });
    }

    console.log(`[ok] ${title} -> ${imagePath}`);
  }

  console.log("\n=== Summary ===");
  console.log(`Total recipes: ${total}`);
  console.log(`Targets: ${targetCount}`);
  console.log(`Success: ${success}`);
  console.log(
    `Failures: noResults=${failures.noResults}, download=${failures.download}, transform=${failures.transform}, write=${failures.write}`
  );

  if (sample.length > 0) {
    console.log("\n=== Samples ===");
    sample.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.title} | ${item.image} | ${item.license}`);
    });
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});