import { useState } from "react";

const PLACEHOLDER = "recipes/images/placeholder.svg";
const EXTENSIONS = ["webp", "jpg", "png", "jpeg"];

function assetPath(src) {
  if (/^(https?:)?\/\//i.test(src) || /^data:/i.test(src)) return src;
  const base = import.meta.env.BASE_URL;
  return src.startsWith(base) ? src : `${base}${src.replace(/^\//, "")}`;
}

function RecipeImageSource({ recipe, ...props }) {
  const [attempt, setAttempt] = useState(0);
  const image = typeof recipe.image === "string" ? recipe.image : recipe.image?.src;
  const stem = recipe.__file?.replace(/\.json$/i, "");
  const candidates = image ? [image] : stem ? EXTENSIONS.map((ext) => `recipes/images/${stem}.${ext}`) : [];
  const src = candidates[attempt] || PLACEHOLDER;
  return <img {...props} src={assetPath(src)} alt={recipe.image?.alt || recipe.title || "요리 사진"} loading="lazy" onError={src === PLACEHOLDER ? undefined : () => setAttempt((n) => n + 1)} />;
}

export default function RecipeImage({ recipe, ...props }) {
  return <RecipeImageSource key={`${recipe.id}-${recipe.__file}-${JSON.stringify(recipe.image)}`} recipe={recipe} {...props} />;
}
