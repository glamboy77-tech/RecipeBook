import React, { useMemo, useState } from "react";
import RecipeViewer from "./RecipeViewer";

/** ---------- utils ---------- **/
function slugifyId(title) {
  const base = (title || "recipe").trim().toLowerCase();
  const slug = base
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `${slug || "recipe"}_${String(Date.now()).slice(-6)}`;
}

function normalizeUnit(raw) {
  if (!raw) return "";
  const u = String(raw).trim().toLowerCase();

  // 정확 단위 (계량도구 기준) - 표준 표기로 통일
  if (u === "큰술" || u === "tb" || u === "tbl" || u === "tbsp" || u === "tablespoon" || u === "t") return "TB";
  if (u === "작은술" || u === "ts" || u === "tsp" || u === "teaspoon") return "t";
  
  // 숟가락 (재료 의존 단위) - 표준 표기로 통일
  if (u === "숟가락" || u === "숟갈" || u === "스푼") return "밥숟가락";

  // weight/volume
  if (u === "kg" || u === "킬로" || u === "킬로그램") return "kg";
  if (u === "g" || u === "그램") return "g";
  if (u === "ml" || u === "밀리" || u === "밀리리터") return "ml";
  if (u === "l" || u === "리터") return "L";
  if (u === "컵" || u === "cup") return "컵";

  // count units
  if (u === "개") return "개";
  if (u === "대") return "대";
  if (u === "마리") return "마리";
  if (u === "줄") return "줄";
  if (u === "조각") return "조각";

  return raw;
}

function inferIngredientType(name) {
  const n = String(name).toLowerCase().trim();
  
  // liquid (액체)
  if (["간장", "식초", "물", "기름", "참기름", "들기름", "식용유", "맛술", "청주", "소주", "물엿", "꿀", "시럽"].some(liquid => n.includes(liquid))) {
    return "liquid";
  }
  
  // paste (점성/페이스트)
  if (["고추장", "된장", "쌈장", "된장", "고추", "추장", "장", "버터", "마요네즈", "케첩"].some(paste => n.includes(paste))) {
    return "paste";
  }
  
  // semi_solid (반고형)
  if (["다진마늘", "다진양파", "다진파", "마늘", "양파", "파", "생강", "생강가루", "고춧가루", "설탕", "소금"].some(semi => n.includes(semi))) {
    return "semi_solid";
  }
  
  return "solid"; // 기타 고체 재료
}

function getSpoonMl(ingredientType) {
  switch (ingredientType) {
    case "liquid": return 10;
    case "semi_solid": return 15;
    case "paste": return 20;
    default: return 15; // 기본값
  }
}

function parseFraction(s) {
  const m = String(s).match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (!b) return null;
  return a / b;
}

function extractBaseServings(raw) {
  const text = String(raw);

  // 3~4인분 / 3-4인분
  const mRange = text.match(/(\d+)\s*[~-]\s*(\d+)\s*인분/);
  if (mRange) return Math.max(1, parseInt(mRange[2], 10));

  // 3인분
  const mOne = text.match(/(\d+)\s*인분/);
  if (mOne) return Math.max(1, parseInt(mOne[1], 10));

  // 못 찾으면 기본값
  return 3;
}

function detectTitle(lines) {
  const t = lines.find((l) => /^제목\s*[:：]/.test(l));
  if (t) return t.replace(/^제목\s*[:：]\s*/, "").trim();
  return (lines[0] || "").trim();
}

// "취향 재료" 키워드(숫자 없는 재료도 살리기)
const VAGUE_WORDS = ["톡톡", "한줌", "왕창", "취향", "취향껏", "약간", "조금", "적당량"];

// 섹션 헤더(그룹명) 키워드
const SECTION_KEYWORDS = [
  "양념장",
  "양념",
  "소스",
  "찍먹",
  "디핑",
  "드레싱",
  "마리네이드",
  "토핑",
  "고명",
  "곁들임",
  "사이드",
  "옵션",
  "추가",
  "마무리",
  "칼국수",
  "면",
  "죽",
  "볶음밥",
];

function cleanHeaderText(line) {
  return String(line).replace(/\s*[:：]\s*$/, "").trim();
}

// 섹션(그룹) 헤더로 인정할지 판단
function detectSectionHeader(line) {
  const t = cleanHeaderText(line);

  if (!t) return null;
  if (t.length > 18) return null; // 너무 길면 문장일 확률↑
  if (/\d/.test(t)) return null; // 숫자 있으면 보통 재료/설명

  // 단위/취향표현이 있으면 재료일 가능성↑ → 헤더 제외
  if (/(큰술|작은술|tbsp|tsp|리터|l|ml|g|kg|개|대|마리|한줌|톡톡|약간|취향)/i.test(t)) return null;

  // 키워드 포함하면 헤더
  if (SECTION_KEYWORDS.some((k) => t.includes(k))) return t;

  // "xxx소스", "xxx양념" 같은 꼬리 패턴도 허용
  if (t.length <= 10 && /(장|소스|양념)$/.test(t)) return t;

  return null;
}

function pushToGroup(groupMap, groupName, item) {
  const key = groupName || "메인";
  if (!groupMap[key]) groupMap[key] = [];
  groupMap[key].push(item);
}

function parseIngredientLine(line, currentGroup) {
  // 탭/다중 공백 정리
  const clean = String(line).replace(/\t+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!clean) return null;

  // 괄호 note 추출
  let parenNote = "";
  const paren = clean.match(/\(([^)]+)\)/);
  if (paren) parenNote = paren[1].trim();

  const noParen = clean.replace(/\([^)]+\)/g, "").trim();

  // 숫자 없는 취향 재료(후추 톡톡, 깨 왕창 등)
  const hasVague = VAGUE_WORDS.some((w) => noParen.includes(w));
  const hasNumber = /\d/.test(noParen) || noParen.includes("반개") || parseFraction(noParen) !== null;

  if (hasVague && !hasNumber) {
    const first = noParen.split(" ").filter(Boolean)[0] || clean;
    const rest = noParen.replace(first, "").trim();
    return {
      name: first,
      amount: null,
      unit: "",
      note: [currentGroup, rest].filter(Boolean).join(" - "),
      scalable: false,
    };
  }

  // amount 추출
  let amount = null;
  let unitRaw = "";

  // "반개" 처리
  if (noParen.includes("반개")) {
    amount = 0.5;
    unitRaw = "개";
  }

  // 분수 우선
  const frac = parseFraction(noParen);
  if (frac !== null) amount = frac;

  // 숫자(소수 포함)
  if (amount === null) {
    const num = noParen.match(/(\d+(\.\d+)?)/);
    if (num) amount = parseFloat(num[1]);
  }

  // unit 추출

  // "1.5리터"처럼 붙어있는 단위
  const stuck = noParen.match(/(\d+(\.\d+)?)(리터|L|ml|g|kg|큰술|작은술|tsp|tbsp|대|개|마리|컵|숟가락|숟갈|스푼|T|t|줄|조각)/i);
  if (stuck) unitRaw = stuck[3];

  // "1/2큰술" 분수 + 단위
  const stuckFrac = noParen.match(/(\d+\s*\/\s*\d+)(리터|L|ml|g|kg|큰술|작은술|tsp|tbsp|대|개|마리|컵|숟가락|숟갈|스푼|T|t|줄|조각)/i);
  if (stuckFrac) unitRaw = stuckFrac[2];

  // 공백 단위: "300 g"
  if (!unitRaw) {
    const tokens = noParen.split(" ").filter(Boolean);
    if (tokens.length >= 2) unitRaw = tokens[1];
  }

  const unit = normalizeUnit(unitRaw);

  // name 추출: 숫자/분수 앞까지
  const name = noParen
    .replace(/반개/g, "")
    .split(/(\d+\s*\/\s*\d+|\d+(\.\d+)?)/)[0]
    .replace(/[:：]/g, "")
    .trim();

  // 재료 타입 추론
  const ingredientType = inferIngredientType(name);
  
  // 숟가락인 경우 approx_ml 계산
  let approxMl = null;
  if (unit === "밥숟가락" && amount !== null) {
    approxMl = getSpoonMl(ingredientType) * amount;
  }

  // note 구성
  const noteParts = [];
  if (currentGroup) noteParts.push(currentGroup);
  if (parenNote) noteParts.push(parenNote);
  
  // 숟가락인 경우 타입 정보 추가
  if (unit === "밥숟가락") {
    noteParts.push(`밥숟가락 기준, ${ingredientType === "liquid" ? "액체" : ingredientType === "paste" ? "점성 재료" : ingredientType === "semi_solid" ? "반고형" : "고체"}`);
  }
  
  const note = noteParts.join(" - ");

  // amount 못 찾으면(애매) 고정 텍스트로
  if (amount === null || Number.isNaN(amount)) {
    return {
      name: clean,
      amount: null,
      unit: "",
      note: currentGroup || "",
      scalable: false,
      ingredient_type: ingredientType,
      approx_ml: null,
    };
  }

  return {
    name: name || clean,
    amount,
    unit,
    note,
    scalable: true,
    ingredient_type: ingredientType,
    approx_ml: approxMl,
  };
}

function parseSteps(raw) {
  const lines = String(raw).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 번호 step: 1. / 2) 등
  const numbered = lines.filter((l) => /^(\d+)[.)]\s*/.test(l));
  const stepLines = numbered.length ? numbered : [];

  return stepLines.map((l) => ({
    text: l.replace(/^(\d+)[.)]\s*/, "").trim(),
    timer_sec: null,
  }));
}

function extractTrailingMemo(raw) {
  const lines = String(raw).split(/\r?\n/).map((l) => l.trim());
  const stepStartIdx = lines.findIndex((l) => /^(\d+)[.)]\s*/.test(l));
  if (stepStartIdx < 0) return "";

  // 마지막 번호 step 찾기
  let lastStepIdx = -1;
  for (let i = stepStartIdx; i < lines.length; i++) {
    if (/^(\d+)[.)]\s*/.test(lines[i])) lastStepIdx = i;
  }
  if (lastStepIdx < 0) return "";

  // 마지막 step 이후의 남은 문장들을 memo로 모음
  const tail = lines
    .slice(lastStepIdx + 1)
    .map((l) => l.trim())
    .filter(Boolean);

  return tail.join("\n");
}

function buildRecipe(rawText, overrides) {
  const allLines = String(rawText).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const title = overrides.title?.trim() || detectTitle(allLines) || "제목없음";
  const base_servings = overrides.base_servings || extractBaseServings(rawText);

  // 그룹 재료 파싱
  const groupMap = {};
  let currentGroup = "메인";

  for (const line of allLines) {
    // step 시작하면 재료 파싱 종료
    if (/^(\d+)[.)]\s*/.test(line)) break;
    if (/^제목\s*[:：]/.test(line)) continue;

    // 섹션 헤더 감지(일반화)
    const header = detectSectionHeader(line);
    if (header) {
      currentGroup = header;
      continue;
    }

    // 재료처럼 보이는 줄인지(완화)
    const looksLikeIngredient =
      line.includes("\t") ||
      /\d/.test(line) ||
      line.includes("반개") ||
      /(큰술|작은술|tbsp|tsp|리터|L|ml|g|kg|개|대|마리)/i.test(line) ||
      VAGUE_WORDS.some((w) => line.includes(w));

    if (!looksLikeIngredient) continue;

    const ing = parseIngredientLine(line, currentGroup);
    if (!ing || !ing.name) continue;

    // 취향/한줌/톡톡 등은 scalable false로 유지
    const isVague = VAGUE_WORDS.some((w) => line.includes(w)) && !/\d/.test(line) && !line.includes("반개") && parseFraction(line) === null;

    pushToGroup(groupMap, currentGroup, {
      name: ing.name,
      amount: isVague ? null : ing.amount,
      unit: isVague ? "" : ing.unit,
      note: ing.note || (isVague ? "취향" : ""),
      scalable: !isVague && ing.scalable !== false,
      // v2 확장(옵셔널)
      ingredient_type: ing.ingredient_type,
      approx_ml: ing.approx_ml,
    });
  }

  const ingredient_groups = Object.entries(groupMap).map(([name, items]) => ({ name, items }));
  const ingredients = ingredient_groups.flatMap((g) => g.items);

  const steps = parseSteps(rawText);

  // 번호 step 뒤에 남은 참고 문장들을 memo로 자동 수집
  const trailingMemo = extractTrailingMemo(rawText);
  const mergedMemo = [overrides.memo || "", trailingMemo].filter(Boolean).join("\n\n");

  return {
    id: slugifyId(title),
    title,
    base_servings,
    tags: overrides.tags || [],
    ingredient_groups,
    ingredients, // 호환용(원하면 나중에 제거 가능)
    steps,
    memo: mergedMemo,
    source: overrides.source || "",
  };
}

const exampleText = `제목 : 닭한마리 칼국수
재료  3~4인분 기준
닭  닭도리탕용 1마리
감자  1개 (3~4등분)
양파  반개
대파  2대
다진마늘  1큰술
다시다  1큰술
치킨스톡  1/2큰술
미원  톡톡
물  1.5리터
후추  취향껏 좀 많이

양념장
고춧가루  3큰술
간장  6큰술
식초  6큰술
물  6큰술
다진마늘  1.5큰술
설탕  2큰술
겨자  1/2큰술
부추  왕창

칼국수 : 생칼국수  2개(300g)

볶음밥 : 밥, 계란, 김가루 한줌, 참기름 취향껏, 깨 왕창

1. 물에 재료를 몽땅넣고 끓인다.
2. 감자가 익으면 끝.
3. 고기를 건져먹고 칼국수를 끓인다. (옵션 : 김치국물)
4. 남은 국물에 밥, 계란, 김가루, 참기름을 넣고 죽을 끓인다.`;

export default function RecipeConverter({ onCreate }) {
  const [inputText, setInputText] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [servings, setServings] = useState(4);
  const [tags, setTags] = useState("한식,국물,칼국수,닭");
  const [memo, setMemo] = useState("");
  const [source, setSource] = useState("");
  const [actionError, setActionError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { parsed, parseError } = useMemo(() => {
    try {
      const obj = buildRecipe(inputText, {
        title: titleOverride || undefined,
        base_servings: servings,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        memo,
        source,
      });
      return { parsed: obj, parseError: "" };
    } catch (e) {
      return { parsed: null, parseError: e?.message || "변환 중 오류" };
    }
  }, [inputText, titleOverride, servings, tags, memo, source]);

  const downloadRecipeFile = () => {
    if (!parsed) {
      setActionError("변환 결과가 없어서 다운로드할 수 없어.");
      return;
    }

    try {
      // 변환된 레시피 객체를 App으로 전달하여 다운로드
      onCreate(parsed);
    } catch (e) {
      setActionError("다운로드 실패: " + e.message);
    }
  };

  const outputJson = parsed ? JSON.stringify(parsed, null, 2) : "";
  const visibleError = actionError || parseError;

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <div style={styles.panelTitle}>레시피 변환기</div>
          <div style={styles.panelHint}>텍스트 → JSON 변환 후 파일 다운로드</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.secondaryBtn} onClick={() => setShowPreview(!showPreview)} disabled={!parsed}>
            {showPreview ? '닫기' : '미리보기'}
          </button>
          <button style={styles.primaryBtn} onClick={downloadRecipeFile} disabled={!parsed}>
            JSON 다운로드
          </button>
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>입력 (텍스트 레시피)</div>
          <textarea
            style={styles.textarea}
            value={inputText}
            onChange={(e) => {
              if (actionError) setActionError("");
              setInputText(e.target.value);
            }}
            spellCheck={false}
          />
          <div style={styles.miniRow}>
            <button style={styles.smallBtn} onClick={() => setInputText(exampleText)}>
              예시 불러오기
            </button>
          </div>
          
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <label>
              제목(덮어쓰기, 선택):
              <input
                value={titleOverride}
                onChange={(e) => {
                  if (actionError) setActionError("");
                  setTitleOverride(e.target.value);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              기준 인분:
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => {
                  if (actionError) setActionError("");
                  setServings(Math.max(1, parseInt(e.target.value || "1", 10)));
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              태그(쉼표):
              <input
                value={tags}
                onChange={(e) => {
                  if (actionError) setActionError("");
                  setTags(e.target.value);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              메모(선택):
              <input
                value={memo}
                onChange={(e) => {
                  if (actionError) setActionError("");
                  setMemo(e.target.value);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              출처(선택):
              <input
                value={source}
                onChange={(e) => {
                  if (actionError) setActionError("");
                  setSource(e.target.value);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>
          </div>

          <div style={styles.miniHint}>
            • 섹션 헤더 예시: "양념장", "소스:", "토핑", "옵션", "곁들임" 등<br/>
            • "후추 톡톡 / 깨 왕창 / 김가루 한줌" 같은 건 숫자 없이도 저장됨(취향 재료)
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>출력 (JSON)</div>
          <textarea
            style={styles.textarea}
            value={outputJson}
            readOnly
            spellCheck={false}
          />
          {visibleError && <div style={styles.errorBox}>{visibleError}</div>}
          <div style={styles.miniHint}>
            ※ 변환 결과가 마음에 안 들면 JSON을 직접 고쳐서 다운로드해도 됨
          </div>
        </div>
      </div>

      {/* 미리보기 섹션 */}
      {showPreview && parsed && (
        <div style={{ marginTop: 16 }}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>레시피 미리보기</div>
              <div style={styles.panelHint}>변환된 JSON이 뷰어에 어떻게 표시되는지 확인</div>
            </div>
          </div>
          <div style={{ 
            border: "1px solid #ddd", 
            borderRadius: 8, 
            padding: 0, 
            backgroundColor: "#fff",
            overflow: "hidden"
          }}>
            <RecipeViewer recipe={parsed} />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: { display: "flex", flexDirection: "column", gap: 12 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  panelTitle: { fontWeight: 900, fontSize: 16 },
  panelHint: { opacity: 0.75, fontSize: 12, marginTop: 2 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: { borderRadius: 16, border: "1px solid #1f263a", background: "#0f1320", padding: 12, minHeight: 200 },
  cardTitle: { fontWeight: 800, fontSize: 13, marginBottom: 8, opacity: 0.95 },
  textarea: { width: "100%", minHeight: 420, resize: "vertical", borderRadius: 14, border: "1px solid #1f263a", background: "#0b0f1b", color: "#e8ecf3", padding: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, outline: "none" },
  primaryBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #3b4aa3", background: "#1a2140", color: "#e8ecf3", cursor: "pointer", fontWeight: 800 },
  secondaryBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #2a3566", background: "#151a2a", color: "#e8ecf3", cursor: "pointer", fontWeight: 800 },
  smallBtn: { padding: "6px 10px", borderRadius: 10, border: "1px solid #2a3566", background: "#151a2a", color: "#e8ecf3", cursor: "pointer", fontWeight: 700, fontSize: 12 },
  errorBox: { marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid #5b2c2c", background: "#271214", color: "#ffd7d7" },
  miniRow: { display: "flex", justifyContent: "flex-end", marginTop: 8 },
  miniHint: { opacity: 0.7, fontSize: 12, marginTop: 8, lineHeight: 1.4 },
};
