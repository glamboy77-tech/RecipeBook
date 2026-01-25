import React, { useEffect, useMemo, useState } from "react";
import { formatIngredientNote, normalizeIngredientAmountUnit, scaleIngredientAmount } from "../lib/recipe";
import { useMediaQuery } from "../lib/useMediaQuery";

function formatAmountUnitForDisplay(amount, unit) {
  if (amount === null || amount === undefined) return "";
  const u = (unit || "").trim();

  // 밥숟가락 표기 개선
  // - 1숟가락 이상: N숟가락
  // - 1숟가락 미만: 티스푼(t)으로 환산 (밥숟가락 0.25 => 0.5t, 0.5 => 1t)
  if (u === "밥숟가락") {
    const v = Number(amount);
    if (!Number.isFinite(v)) return `${amount}숟가락`;

    if (v >= 1) {
      return `${v}숟가락`;
    }

    // 1 숟가락(=밥숟가락 표기) = 2t 로 가정 (0.5 숟가락 -> 1t)
    // 보기 좋게 0.5t 단위로 반올림, 0보다 큰 값은 최소 0.5t로 클램프
    const tRounded = Math.round(v * 2 * 2) / 2; // (v*2) => t, then round by 0.5
    const t = v > 0 ? Math.max(0.5, tRounded) : 0;
    return `${t}t`;
  }

  return `${amount}${u}`;
}

function formatTimeTotal(minutes) {
  if (minutes === null || minutes === undefined) return "";
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return "";

  const hours = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (hours > 0 && mins > 0) return `약 ${hours}시간 ${mins}분`;
  if (hours > 0) return `약 ${hours}시간`;
  return `약 ${mins}분`;
}

function RecipeViewerEmbedded({ recipe }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [targetServings, setTargetServings] = useState(recipe?.base_servings || 4);

  const base = recipe?.base_servings || 1;
  const target = targetServings;

  return (
    <div style={{ padding: 16, backgroundColor: "#0b0d12", color: "#e8ecf3" }}>
      <div style={styles.panelHeader}>
        <div>
          <div style={styles.panelTitle}>레시피 미리보기</div>
          <div style={styles.panelHint}>변환된 레시피 상세 내용</div>
        </div>
      </div>

      <div style={{ maxHeight: "500px", overflow: "auto", minHeight: 0 }}>
        <div style={styles.recipeDetail}>
          <div style={styles.recipeHeader}>
            <h2 style={styles.recipeTitle}>{recipe?.title || "제목 없음"}</h2>
            <div style={styles.recipeMeta}>
              <span style={styles.servingsText}>
                기준 {base}인분 → {target}인분
              </span>
              {formatTimeTotal(recipe?.time_total_min) ? (
                <span style={styles.timeText}>조리시간: {formatTimeTotal(recipe?.time_total_min)}</span>
              ) : null}
              <div style={styles.servingsControls}>
                <button style={styles.servingsBtn} onClick={() => setTargetServings((s) => Math.max(1, s - 1))}>
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={targetServings}
                  onChange={(e) => setTargetServings(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  style={styles.servingsInput}
                />
                <button style={styles.servingsBtn} onClick={() => setTargetServings((s) => s + 1)}>
                  +
                </button>
              </div>
            </div>

            {recipe?.tags?.length > 0 && (
              <div style={styles.tagContainer}>
                {recipe.tags.map((tag, idx) => (
                  <span key={idx} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...styles.grid2, gridTemplateColumns: isMobile ? "1fr" : styles.grid2.gridTemplateColumns }}>
            <div style={{ ...styles.card, backgroundColor: "#121623", border: "1px solid #1f263a" }}>
              <div style={styles.cardTitle}>재료</div>
              {(recipe?.ingredient_groups || []).map((g, gIdx) => (
                <div key={gIdx} style={styles.ingredientGroup}>
                  <h4 style={styles.groupName}>{g.name}</h4>
                  <ul style={styles.ingredientList}>
                    {(g.items || []).map((ing, idx) => {
                      const normalized = normalizeIngredientAmountUnit(ing?.amount, ing?.unit);
                      const scaled = scaleIngredientAmount(ing, base, target);
                      const note = formatIngredientNote(ing.note, g.name);

                      return (
                        <li key={idx} style={styles.ingredientItem}>
                          <span style={styles.ingredientName}>{ing.name}</span>
                          <span style={styles.ingredientAmount}>
                            {scaled !== null && scaled !== undefined
                              ? `: ${formatAmountUnitForDisplay(scaled, normalized.unit)}`
                              : ""}
                            {note ? ` (${note})` : ""}
                            {ing.scalable === false ? " [취향]" : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ ...styles.card, backgroundColor: "#121623", border: "1px solid #1f263a" }}>
              <div style={styles.cardTitle}>요리법</div>
              <div style={styles.stepList}>
                {(recipe?.steps || []).map((step, idx) => (
                  <div key={idx} style={styles.stepItem}>
                    <span style={styles.stepNumber}>{idx + 1}</span>
                    <span style={styles.stepText}>{step.text}</span>
                    {step.timer_sec ? <span style={styles.timer}>⏱ {step.timer_sec}초</span> : null}
                  </div>
                ))}
              </div>

              {recipe?.memo ? (
                <>
                  <div style={styles.sectionDivider} />
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>메모</div>
                  <div style={styles.memo}>{recipe.memo}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...styles.measurementGuide, backgroundColor: "#121623", border: "1px solid #1f263a" }}>
        <div style={styles.guideTitle}>※ 계량 기준</div>
        <div style={styles.guideContent}>
          <div>• 컵: 200ml</div>
          <div>• TB(계량큰술): 15ml</div>
          <div>• t(티스푼): 5ml</div>
          <div>• 숟가락(표기): 1숟가락 미만은 t로 환산해서 표시</div>
          <div>• 숟가락(참고): 재료에 따라 부피가 다름</div>
          <div style={styles.guideIndent}>· 액체 ≈ 10ml</div>
          <div style={styles.guideIndent}>· 반고형 ≈ 15ml</div>
          <div style={styles.guideIndent}>· 점성/페이스트 ≈ 20ml</div>
        </div>
      </div>
    </div>
  );
}

function RecipeViewerApp() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [recipes, setRecipes] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [targetServings, setTargetServings] = useState(4);
  const [mobilePane, setMobilePane] = useState("list"); // 'list' | 'detail'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("title");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const base = import.meta.env.BASE_URL;
        const res = await fetch(`${base}recipes/index.json`);
        if (!res.ok) throw new Error("index.json 로드 실패");
        const files = await res.json();

        const loaded = [];
        for (const file of files) {
          const r = await fetch(`${base}recipes/${file}`);
          if (!r.ok) {
            console.warn(`Failed to load ${file}`);
            continue;
          }
          const obj = await r.json();
          loaded.push(obj);
        }

        loaded.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ko"));
        setRecipes(loaded);
        if (loaded.length > 0) {
          setSelectedId(loaded[0].id);
          setTargetServings(loaded[0].base_servings || 4);
        }
      } catch (e) {
        console.error(e);
        setError("레시피 로딩 실패: public/recipes/index.json 경로/내용을 확인해줘");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selected = useMemo(() => recipes.find((r) => r.id === selectedId) || null, [recipes, selectedId]);

  // 모바일에서 선택이 생기면 자동으로 상세로 이동
  useEffect(() => {
    if (!isMobile) return;
    if (selectedId) setMobilePane("detail");
  }, [isMobile, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;

    return recipes.filter((r) => {
      const title = (r.title || "").toLowerCase();
      const tags = (r.tags || []).join(" ").toLowerCase();

      const ingText = (() => {
        if (r.ingredient_groups?.length) {
          return r.ingredient_groups
            .flatMap((g) => g.items || [])
            .map((i) => i.name)
            .join(" ")
            .toLowerCase();
        }
        return (r.ingredients || []).map((i) => i.name).join(" ").toLowerCase();
      })();

      return title.includes(q) || tags.includes(q) || ingText.includes(q);
    });
  }, [recipes, query]);

  const sortedFiltered = useMemo(() => {
    const sorted = [...filtered];
    switch (sortBy) {
      case "title":
        return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ko"));
      case "recent":
        return sorted.sort((a, b) => {
          const aTime = a.id?.split("_").pop() || "0";
          const bTime = b.id?.split("_").pop() || "0";
          return bTime.localeCompare(aTime);
        });
      case "tags":
        return sorted.sort((a, b) => {
          const aTags = (a.tags || []).join(", ");
          const bTags = (b.tags || []).join(", ");
          return aTags.localeCompare(bTags, "ko");
        });
      default:
        return sorted;
    }
  }, [filtered, sortBy]);

  // 선택 변경 시 targetServings 초기화는 onClick 핸들러에서 처리

  if (loading) {
    return (
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <div style={styles.panelTitle}>레시피 뷰어</div>
            <div style={styles.panelHint}>파일 시스템에서 레시피 로딩 중...</div>
          </div>
        </div>
        <div style={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <div style={styles.panelTitle}>레시피 뷰어</div>
            <div style={styles.panelHint}>오류 발생</div>
          </div>
        </div>
        <div style={styles.errorBox}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.panelTitle}>레시피 뷰어</div>
          <div style={styles.panelHint}>파일 시스템 기반 레시피 뷰어</div>
        </div>

        {isMobile ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                ...styles.primaryBtn,
                padding: "8px 10px",
                borderRadius: 12,
              }}
              onClick={() => setMobilePane((p) => (p === "list" ? "detail" : "list"))}
              disabled={!selectedId && mobilePane === "list"}
              title="목록/상세 전환"
            >
              {mobilePane === "list" ? "상세" : "목록"}
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ ...styles.grid2, gridTemplateColumns: isMobile ? "1fr" : styles.grid2.gridTemplateColumns }}>
        {/* 왼쪽: 목록 + 검색 */}
        <div style={{ ...styles.card, ...(isMobile && mobilePane !== "list" ? styles.mobileHidden : {}) }}>
          <div style={styles.cardTitle}>레시피 목록</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 제목/태그/재료"
            style={{ width: "100%", padding: 8, marginBottom: 12, boxSizing: "border-box", ...styles.input }}
          />

          {/* 정렬 선택 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ flex: 1, padding: 6, ...styles.input }}
            >
              <option value="title">제목 순</option>
              <option value="recent">최신 순</option>
              <option value="tags">태그 순</option>
            </select>
          </div>

          <div style={{ maxHeight: "550px", overflow: "auto", minHeight: 0 }}>
            {sortedFiltered.length === 0 ? (
              <div style={styles.emptyBox}>검색 결과 없음</div>
            ) : (
              sortedFiltered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedId(r.id);
                    setTargetServings(r.base_servings || 4);
                    if (isMobile) setMobilePane("detail");
                  }}
                  style={{
                    ...styles.listItem,
                    ...(selectedId === r.id ? styles.listItemActive : {}),
                  }}
                >
                  <div style={styles.listItemTitle}>{r.title}</div>
                  <div style={styles.listItemMeta}>
                    기준 {r.base_servings ?? "?"}인분 · 태그 {(r.tags || []).slice(0, 4).join(", ") || "-"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽: 재료 + 요리법 */}
        <div style={{ ...styles.card, ...(isMobile && mobilePane !== "detail" ? styles.mobileHidden : {}) }}>
          <div style={styles.cardTitle}>레시피 상세</div>
          {!selected ? (
            <div style={styles.emptyBox}>레시피를 선택해줘.</div>
          ) : (
            <div style={styles.recipeDetail}>
              <div style={styles.recipeHeader}>
                <div>
                  <div style={styles.recipeTitle}>{selected.title}</div>
                  <div style={styles.recipeMeta}>
                    태그: {(selected.tags || []).join(", ") || "-"}
                  </div>
                  {formatTimeTotal(selected?.time_total_min) ? (
                    <div style={styles.recipeMeta}>조리시간: {formatTimeTotal(selected?.time_total_min)}</div>
                  ) : null}
                </div>

                <div style={styles.servingsControl}>
                  <div style={styles.servingsLabel}>인분</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <button 
                      style={styles.servingsBtn} 
                      onClick={() => setTargetServings(Math.max(1, targetServings - 1))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={targetServings}
                      onChange={(e) => setTargetServings(Math.max(1, parseInt(e.target.value || "1", 10)))}
                      style={styles.servingsInput}
                    />
                    <button 
                      style={styles.servingsBtn} 
                      onClick={() => setTargetServings(targetServings + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div style={styles.servingsNote}>
                    기준: {selected.base_servings}인분
                  </div>
                </div>
              </div>

              <div style={styles.sectionDivider} />

              {/* 재료 */}
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>재료</h4>
                {selected.ingredient_groups?.length ? (
                  selected.ingredient_groups.map((g, gi) => (
                    <div key={gi} style={styles.ingredientGroup}>
                      <div style={styles.groupName}>{g.name}</div>
                      <ul style={styles.ingredientList}>
                        {(g.items || []).map((ing, idx) => {
                          const base = selected.base_servings || 1;
                          const normalized = normalizeIngredientAmountUnit(ing?.amount, ing?.unit);
                          const scaled = scaleIngredientAmount(ing, base, targetServings);
                          const note = formatIngredientNote(ing.note, g.name);

                          return (
                            <li key={idx} style={styles.ingredientItem}>
                              <span style={styles.ingredientName}>{ing.name}</span>
                              <span style={styles.ingredientAmount}>
                                {scaled !== null && scaled !== undefined
                                  ? `: ${formatAmountUnitForDisplay(scaled, normalized.unit)}`
                                  : ""}
                                {note ? ` (${note})` : ""}
                                {ing.scalable === false ? " [취향]" : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                ) : (
                  <ul style={styles.ingredientList}>
                    {(selected.ingredients || []).map((ing, idx) => {
                      const base = selected.base_servings || 1;
                      const normalized = normalizeIngredientAmountUnit(ing?.amount, ing?.unit);
                      const scaled = scaleIngredientAmount(ing, base, targetServings);
                      const note = formatIngredientNote(ing.note, "");

                      return (
                        <li key={idx} style={styles.ingredientItem}>
                          <span style={styles.ingredientName}>{ing.name}</span>
                          <span style={styles.ingredientAmount}>
                            {scaled !== null && scaled !== undefined
                              ? `: ${formatAmountUnitForDisplay(scaled, normalized.unit)}`
                              : ""}
                            {note ? ` (${note})` : ""}
                            {ing.scalable === false ? " [취향]" : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div style={styles.sectionDivider} />

              {/* 요리법 */}
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>요리법</h4>
                <ol style={styles.stepsList}>
                  {(selected.steps || []).map((s, idx) => (
                    <li key={idx} style={styles.stepItem}>{s.text}</li>
                  ))}
                </ol>
                {selected.steps?.length === 0 && (
                  <div style={styles.emptyBox}>요리법이 없습니다.</div>
                )}
              </div>

              {selected.memo && (
                <>
                  <div style={styles.sectionDivider} />
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>메모</h4>
                    <div style={styles.memo}>{selected.memo}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 계량 기준 안내 */}
      <div style={styles.measurementGuide}>
        <div style={styles.guideTitle}>※ 계량 기준</div>
        <div style={styles.guideContent}>
          <div>• 컵: 200ml</div>
          <div>• TB(계량큰술): 15ml</div>
          <div>• t(티스푼): 5ml</div>
          <div>• 숟가락(표기): 1숟가락 미만은 t로 환산해서 표시</div>
          <div>• 숟가락(참고): 재료에 따라 부피가 다름</div>
          <div style={styles.guideIndent}>· 액체 ≈ 10ml</div>
          <div style={styles.guideIndent}>· 반고형 ≈ 15ml</div>
          <div style={styles.guideIndent}>· 점성/페이스트 ≈ 20ml</div>
        </div>
      </div>
    </div>
  );
}

export default function RecipeViewer({ recipe: propRecipe }) {
  // key를 주면(레시피 id 기준) propRecipe가 바뀔 때 Embedded가 remount되어
  // targetServings가 base_servings로 자연스럽게 초기화됨(Effect 없이)
  return propRecipe ? <RecipeViewerEmbedded key={propRecipe.id} recipe={propRecipe} /> : <RecipeViewerApp />;
}

const styles = {
  panel: { display: "flex", flexDirection: "column", gap: 12 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  panelTitle: { fontWeight: 900, fontSize: 16 },
  panelHint: { opacity: 0.75, fontSize: 12, marginTop: 2 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: { borderRadius: 16, border: "1px solid #1f263a", background: "#0f1320", padding: 12, minHeight: 200 },
  cardTitle: { fontWeight: 800, fontSize: 13, marginBottom: 8, opacity: 0.95 },
  input: { borderRadius: 8, border: "1px solid #2a3566", background: "#0b0f1b", color: "#e8ecf3", padding: 8 },
  primaryBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #3b4aa3", background: "#1a2140", color: "#e8ecf3", cursor: "pointer", fontWeight: 800 },
  loading: { textAlign: "center", padding: 20, opacity: 0.7, color: "#e8ecf3" },
  errorBox: { padding: 10, borderRadius: 12, border: "1px solid #5b2c2c", background: "#271214", color: "#ffd7d7" },
  emptyBox: { padding: 12, borderRadius: 14, border: "1px dashed #2a3566", opacity: 0.8, lineHeight: 1.4, textAlign: "center", color: "#e8ecf3" },

  // 목록 스타일
  listItem: { padding: 10, borderRadius: 14, border: "1px solid #1f263a", background: "#0f1320", cursor: "pointer", marginBottom: 8, textAlign: "left", width: "100%" },
  listItemActive: { borderColor: "#3b4aa3", background: "#121a33" },
  listItemTitle: { fontWeight: 800, fontSize: 14, color: "#e8ecf3" },
  listItemMeta: { opacity: 0.65, fontSize: 11, marginTop: 4, color: "#e8ecf3" },

  // 레시피 상세 스타일
  recipeDetail: { minHeight: 0 }, // overflow 제거, minHeight만 유지
  recipeHeader: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  recipeTitle: { fontSize: 20, fontWeight: 800, color: "#e8ecf3" },
  recipeMeta: { fontSize: 13, opacity: 0.8, marginTop: 6, color: "#e8ecf3" },
  timeText: { marginLeft: 12, fontSize: 12, opacity: 0.85 },
  servingsControl: { minWidth: 220 },
  servingsLabel: { fontSize: 12, opacity: 0.8, color: "#e8ecf3" },
  servingsBtn: { padding: "4px 8px", borderRadius: 6, border: "1px solid #2a3566", background: "#151a2a", color: "#e8ecf3", cursor: "pointer", fontSize: 12 },
  servingsInput: { width: 60, padding: "4px 6px", borderRadius: 6, border: "1px solid #2a3566", background: "#0b0f1b", color: "#e8ecf3", textAlign: "center", fontSize: 12 },
  servingsNote: { fontSize: 12, opacity: 0.75, marginTop: 6, color: "#e8ecf3" },

  sectionDivider: { height: 1, background: "#1f263a", margin: "16px 0" },
  section: { marginBottom: 16 },
  sectionTitle: { margin: "0 0 8px 0", fontSize: 16, fontWeight: 800, color: "#e8ecf3" },
  ingredientGroup: { marginBottom: 12 },
  groupName: { fontWeight: 800, marginBottom: 6, color: "#e8ecf3" },
  ingredientList: { margin: 0, paddingLeft: 16, listStyle: "none" },
  ingredientItem: { display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#e8ecf3" },
  ingredientName: { fontWeight: 800 },
  ingredientAmount: { opacity: 0.9 },
  stepsList: { margin: 0, paddingLeft: 18, color: "#e8ecf3" },
  stepItem: { marginBottom: 8, lineHeight: 1.4 },
  memo: { whiteSpace: "pre-wrap", opacity: 0.8, color: "#e8ecf3" },

  // 모바일에서 한쪽 패널 숨김
  mobileHidden: { display: "none" },
  
  // 계량 기준 안내 스타일
  measurementGuide: { padding: 12, borderRadius: 12, border: "1px solid #2a3566", background: "#0b0f1b", marginTop: 8 },
  guideTitle: { fontWeight: 800, fontSize: 13, marginBottom: 6, color: "#e8ecf3" },
  guideContent: { fontSize: 12, lineHeight: 1.4, color: "#e8ecf3" },
  guideIndent: { marginLeft: 16, opacity: 0.8 },
};
