import { useState } from "react";
import { formatIngredientNote, normalizeIngredientAmountUnit, scaleIngredientAmount } from "../lib/recipe";
import { formatAmountUnitForDisplay, formatTimeTotal } from "../lib/recipeDisplay";
import Icon from "./Icon";
import RecipeImage from "./RecipeImage";

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Try the browser fallback. */ }
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(field);
  const previous = document.activeElement;
  try {
    field.select();
    if (!document.execCommand("copy")) throw new Error("복사 실패");
  } finally { field.remove(); previous?.focus(); }
}

function ingredientText(ing, group, base, target) {
  const normalized = normalizeIngredientAmountUnit(ing.amount, ing.unit);
  const amount = scaleIngredientAmount(ing, base, target);
  const note = formatIngredientNote(ing.note, group);
  return [amount == null ? "" : formatAmountUnitForDisplay(amount, normalized.unit), note, ing.scalable === false || ing.scale_mode === "to_taste" ? "취향껏" : ""].filter(Boolean).join(" · ");
}

export default function RecipeDetail({ recipe, onBack }) {
  const base = recipe.base_servings || 1;
  const [servings, setServings] = useState(base);
  const [status, setStatus] = useState("");
  const groups = recipe.ingredient_groups?.length ? recipe.ingredient_groups : [{ name: "기본 재료", items: recipe.ingredients || [] }];
  const time = formatTimeTotal(recipe.time_total_min);
  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("recipe", recipe.id);
    return url.toString();
  };

  async function share() {
    try {
      if (navigator.share) {
        try { await navigator.share({ title: `${recipe.title} 레시피`, url: shareUrl() }); return; }
        catch (e) { if (e.name === "AbortError") return; }
      }
      await copyText(shareUrl());
      setStatus("공유 링크를 복사했어요.");
    } catch { setStatus("링크를 복사하지 못했어요. 다시 시도해주세요."); }
  }

  async function copyRecipe() {
    const text = [recipe.title, `${servings}인분 (기준 ${base}인분)`, "", "[재료]", ...groups.flatMap((g) => [`[${g.name}]`, ...(g.items || []).map((ing) => `- ${ing.name}: ${ingredientText(ing, g.name, base, servings)}`)]), "", "[만드는 법]", ...(recipe.steps || []).map((s, i) => `${i + 1}. ${s.text}`), recipe.memo ? `\n[메모]\n${recipe.memo}` : "", "", shareUrl()].join("\n");
    try { await copyText(text); setStatus(`${servings}인분 기준으로 레시피를 복사했어요.`); }
    catch { setStatus("내용을 복사하지 못했어요. 다시 시도해주세요."); }
  }

  return (
    <article className="recipe-sheet" aria-label={`${recipe.title} 레시피`}>
      <div className="detail-toolbar">
        {onBack ? <button className="back-button" onClick={onBack}><Icon name="back" />목록으로</button> : <span className="eyebrow">RECIPE NOTE</span>}
        <div className="share-actions">
          <button className="quiet-button" onClick={copyRecipe}><Icon name="copy" /><span>내용 복사</span></button>
          <button className="quiet-button" onClick={share}><Icon name="share" /><span>공유</span></button>
        </div>
      </div>
      <div className="share-status" role="status">{status}</div>
      <div className="recipe-intro">
        <div className="recipe-heading">
          <span className="eyebrow">FROM MY KITCHEN</span>
          <h1>{recipe.title}</h1>
          <div className="recipe-facts">
            {time && <span><Icon name="clock" size={16} />{time}</span>}
            <span><Icon name="people" size={16} />기준 {base}인분</span>
          </div>
          {!!recipe.tags?.length && <div className="recipe-tags">{recipe.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        </div>
        <div className="hero-image"><RecipeImage recipe={recipe} /></div>
      </div>
      <div className="recipe-body">
        <section className="ingredients-section" aria-labelledby="ingredients-heading">
          <div className="section-heading"><h2 id="ingredients-heading">재료 준비</h2><span>INGREDIENTS</span></div>
          <div className="servings-bar">
            <label htmlFor="servings">몇 인분 만들까요?</label>
            <div className="servings-stepper">
              <button aria-label="인분 줄이기" disabled={servings <= 1} onClick={() => setServings((n) => Math.max(1, n - 1))}><Icon name="minus" size={14} /></button>
              <input id="servings" type="number" inputMode="numeric" min="1" step="1" value={servings} onChange={(e) => { const n = Number(e.target.value); setServings(Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1); }} />
              <span>인분</span>
              <button aria-label="인분 늘리기" onClick={() => setServings((n) => n + 1)}><Icon name="plus" size={14} /></button>
            </div>
          </div>
          <p className="ingredient-hint">준비한 재료를 눌러 체크해보세요.</p>
          {groups.map((g, gi) => <div className="ingredient-group" key={gi}>
            <h3>{g.name}</h3>
            <ul>{(g.items || []).map((ing, i) => <li key={i}>
              <label className="ingredient-row"><input type="checkbox" /><span className="custom-check"><Icon name="check" size={12} /></span><span className="ingredient-copy"><span className="ingredient-name">{ing.name}</span><span className="ingredient-amount">{ingredientText(ing, g.name, base, servings)}</span></span></label>
            </li>)}</ul>
          </div>)}
          <details className="measurement-guide"><summary>계량 기준 안내</summary><div><p>1컵 = 200ml · TB(계량큰술) = 15ml · t(티스푼) = 5ml</p><p>밥숟가락은 재료에 따라 부피가 달라요. 액체 약 10ml, 반고형 약 15ml, 페이스트 약 20ml를 참고하세요.</p><p>1숟가락 미만은 티스푼(t)으로 환산해 표시해요.</p></div></details>
        </section>
        <section className="method-section" aria-labelledby="method-heading">
          <div className="section-heading"><h2 id="method-heading">만드는 법</h2><span>METHOD</span></div>
          <ol className="steps-list">{(recipe.steps || []).map((s, i) => <li key={i}><span className="step-number">{String(i + 1).padStart(2, "0")}</span><div><p>{s.text}</p>{s.timer_sec > 0 && <span className="step-time"><Icon name="clock" size={14} />{s.timer_sec >= 60 ? `${Math.floor(s.timer_sec / 60)}분 ${s.timer_sec % 60 ? `${s.timer_sec % 60}초` : ""}` : `${s.timer_sec}초`}</span>}</div></li>)}</ol>
          {!recipe.steps?.length && <p className="muted">아직 조리 순서가 없어요.</p>}
          {recipe.memo && <aside className="recipe-memo"><span className="eyebrow">KITCHEN NOTE</span><h3>기억해둘 것</h3><p>{recipe.memo}</p></aside>}
        </section>
      </div>
      <footer className="recipe-footer"><Icon name="bowl" size={18} /><span>오늘도 맛있는 한 끼.</span></footer>
    </article>
  );
}
