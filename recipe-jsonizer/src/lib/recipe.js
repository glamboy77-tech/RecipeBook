// 레시피 데이터/스케일링 공통 유틸
// - v1: 기존 JSON과 100% 호환(필드는 모두 optional)
// - v2 대비: scale_mode/scale_power/max_amount/yield 등 확장 포인트 제공

/**
 * @typedef {"linear"|"sublinear"|"capped"|"fixed"|"to_taste"} ScaleMode
 */

/**
 * @typedef {Object} RecipeIngredient
 * @property {string} name
 * @property {number|null|undefined} [amount]
 * @property {string|undefined} [unit]
 * @property {string|undefined} [note]
 * @property {boolean|undefined} [scalable]
 *
 * // v2 확장(모두 optional)
 * @property {ScaleMode|undefined} [scale_mode]
 * @property {number|undefined} [scale_power] // sublinear일 때 사용(예: 0.85)
 * @property {number|undefined} [max_amount]  // capped일 때 상한
 * @property {number|undefined} [min_amount]  // (선택) 하한
 * @property {string|undefined} [ingredient_type]
 * @property {number|null|undefined} [approx_ml]
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} title
 * @property {number} base_servings
 * @property {string[]} [tags]
 * @property {{name: string, items: RecipeIngredient[]}[]} [ingredient_groups]
 * @property {RecipeIngredient[]} [ingredients]
 * @property {{text: string, timer_sec: number|null}[]} [steps]
 * @property {string} [memo]
 * @property {string} [source]
 *
 * // v2 확장(모두 optional)
 * @property {{amount: number, unit: "servings"|"g"|"kg"|"ml"|"L"|string}|undefined} [yield]
 */

function roundByUnit(value, unit) {
  if (!Number.isFinite(value)) return value;

  // 개수 단위 → 0.5 단위
  if (["개", "대", "마리"].includes(unit || "")) {
    return Math.round(value * 2) / 2;
  }

  return Math.round(value * 100) / 100;
}

/**
 * unit 문자열에 숫자가 포함된 경우를 정규화한다.
 * 예)
 * - amount: 1, unit: "1뿌리"   => amount: 1, unit: "뿌리"   (실표기는 1뿌리)
 * - amount: 2, unit: "0.7컵"  => amount: 1.4, unit: "컵"  (스케일링/표시에서 중복 숫자 제거)
 * - amount: null, unit: "1뿌리" => amount: null, unit: "1뿌리" (양이 없으면 그대로 둠)
 */
export function normalizeIngredientAmountUnit(amount, unit) {
  const u = (unit || "").trim();
  if (!u) return { amount, unit };
  if (amount === null || amount === undefined) return { amount, unit };
  if (!Number.isFinite(amount)) return { amount, unit };

  // unit이 숫자로 시작하는 케이스: "0.7컵", "1뿌리", "2 개" 등
  const m = u.match(/^([0-9]+(?:\.[0-9]+)?)\s*(.+)$/);
  if (!m) return { amount, unit };

  const factor = Number(m[1]);
  const pureUnit = (m[2] || "").trim();
  if (!Number.isFinite(factor) || factor === 0 || !pureUnit) return { amount, unit };

  return { amount: amount * factor, unit: pureUnit };
}

/**
 * 기본은 선형 스케일링.
 * v2 대비로 ingredient.scale_mode 등을 해석하지만, 값이 없으면 기존과 동일하게 동작.
 *
 * @param {RecipeIngredient} ing
 * @param {number} baseServings
 * @param {number} targetServings
 */
export function scaleIngredientAmount(ing, baseServings, targetServings) {
  const normalized = normalizeIngredientAmountUnit(ing?.amount, ing?.unit);
  const amount = normalized.amount;
  if (amount === null || amount === undefined) return null;
  if (!Number.isFinite(amount)) return amount;

  const scalable = ing?.scalable !== false; // 기본 true
  if (!scalable) return amount;

  const mode = ing?.scale_mode;
  const k = targetServings / Math.max(1, baseServings || 1);
  let scaled;

  if (!mode || mode === "linear") {
    scaled = amount * k;
  } else if (mode === "fixed") {
    scaled = amount;
  } else if (mode === "to_taste") {
    return null;
  } else if (mode === "sublinear") {
    const p = typeof ing.scale_power === "number" ? ing.scale_power : 0.85;
    scaled = amount * Math.pow(k, p);
  } else if (mode === "capped") {
    scaled = amount * k;
    if (typeof ing.max_amount === "number") scaled = Math.min(scaled, ing.max_amount);
    if (typeof ing.min_amount === "number") scaled = Math.max(scaled, ing.min_amount);
  } else {
    scaled = amount * k;
  }

  return roundByUnit(scaled, normalized.unit);
}

/**
 * 표시용 note 정리: 그룹명/단위 타입 문자열 등을 제거해서 UI 중복을 줄임.
 */
export function formatIngredientNote(rawNote, groupName) {
  const note = (rawNote || "").trim();
  if (!note) return "";

  let cleaned = note;
  if (groupName) {
    cleaned = cleaned.replace(new RegExp(`^${escapeRegExp(groupName)}\\s*-\\s*`), "");
  }

  cleaned = cleaned
    .replace(/\s*-\s*밥숟가락\s*기준,\s*(고체|액체|반고형|점성\s*재료|페이스트)\s*/gi, "")
    .replace(/^밥숟가락\s*기준,\s*(고체|액체|반고형|점성\s*재료|페이스트)\s*/gi, "")
    .trim();

  if (groupName && (cleaned === groupName || cleaned === "")) return "";
  return cleaned;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
