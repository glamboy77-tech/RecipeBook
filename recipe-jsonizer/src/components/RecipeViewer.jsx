import { useEffect, useMemo, useRef, useState } from "react";
import { formatTimeTotal } from "../lib/recipeDisplay";
import RecipeImage from "./RecipeImage";
import RecipeDetail from "./RecipeDetail";
import Icon from "./Icon";

function RecipeLibrary() {
  const [recipes, setRecipes] = useState([]);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [reload, setReload] = useState(0);
  const detailRef = useRef(null);
  const listRef = useRef(null);
  const selectionRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setWarning("");
      try {
        const base = import.meta.env.BASE_URL;
        const response = await fetch(`${base}recipes/index.json`, { signal: controller.signal });
        if (!response.ok) throw new Error("목록 로드 실패");
        const files = await response.json();
        const loaded = [];
        let failed = 0;
        // Limit concurrency without loading every recipe one network round trip at a time.
        for (let offset = 0; offset < files.length; offset += 12) {
          const batch = await Promise.allSettled(files.slice(offset, offset + 12).map(async (file) => {
            const res = await fetch(`${base}recipes/${file}`, { signal: controller.signal });
            if (!res.ok) throw new Error(file);
            return { ...await res.json(), __file: file };
          }));
          if (controller.signal.aborted) return;
          for (const result of batch) {
            if (result.status === "fulfilled") loaded.push(result.value);
            else failed++;
          }
        }
        if (files.length && !loaded.length) throw new Error("레시피 로드 실패");
        loaded.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ko"));
        setRecipes(loaded);
        if (failed) setWarning(`${failed}개의 레시피를 불러오지 못했어요.`);
        const requestedId = new URLSearchParams(window.location.search).get("recipe");
        const requested = loaded.find((r) => r.id === requestedId);
        setSelectedId(requested?.id || loaded[0]?.id || null);
        setDetailOpen(Boolean(requested));
      } catch (e) {
        if (e.name !== "AbortError") setError("레시피를 불러오지 못했어요. 연결 상태를 확인한 뒤 다시 시도해주세요.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    function navigate() {
      const id = new URLSearchParams(window.location.search).get("recipe");
      if (recipes.some((r) => r.id === id)) { setSelectedId(id); setDetailOpen(true); }
      else setDetailOpen(false);
    }
    window.addEventListener("popstate", navigate);
    return () => window.removeEventListener("popstate", navigate);
  }, [recipes]);

  const selected = recipes.find((r) => r.id === selectedId);
  const tags = useMemo(() => {
    const counts = new Map();
    recipes.forEach((r) => (r.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([t]) => t);
  }, [recipes]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      const ingredients = r.ingredient_groups?.length ? r.ingredient_groups.flatMap((g) => g.items || []) : r.ingredients || [];
      return (!tag || r.tags?.includes(tag)) && (!q || [r.title, ...(r.tags || []), ...ingredients.map((i) => i.name)].join(" ").toLowerCase().includes(q));
    }).sort((a, b) => {
      if (sortBy === "tags") return (a.tags || []).join().localeCompare((b.tags || []).join(), "ko") || a.title.localeCompare(b.title, "ko");
      // Preserve the original ID-based ordering for existing recipe files.
      if (sortBy === "recent") return (b.id?.split("_").pop() || "0").localeCompare(a.id?.split("_").pop() || "0");
      return a.title.localeCompare(b.title, "ko");
    });
  }, [recipes, query, tag, sortBy]);

  function selectRecipe(recipe, target) {
    selectionRef.current = target;
    setSelectedId(recipe.id);
    setDetailOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("recipe", recipe.id);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    requestAnimationFrame(() => {
      detailRef.current?.scrollTo({ top: 0 });
      detailRef.current?.focus({ preventScroll: true });
    });
  }

  function showList() {
    setDetailOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("recipe");
    window.history.pushState(null, "", url);
    requestAnimationFrame(() => (selectionRef.current || listRef.current)?.focus({ preventScroll: true }));
  }

  return (
    <div className={`library-layout ${detailOpen ? "is-detail-open" : ""}`}>
      <aside className="recipe-sidebar" aria-label="레시피 목록" ref={listRef} tabIndex={-1}>
        <div className="library-intro"><span className="eyebrow">MY COLLECTION</span><h2>오늘은 무엇을<br />만들어볼까요<span className="accent">?</span></h2><p>차곡차곡 모아둔, 나의 맛있는 기록.</p></div>
        <div className="library-filters">
          <div className="search-field"><Icon name="search" size={19} /><input type="search" aria-label="레시피 검색" placeholder="요리 이름, 재료로 찾아보세요" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button aria-label="검색어 지우기" onClick={() => setQuery("")}><Icon name="close" size={15} /></button>}</div>
          <div className="tag-filters" aria-label="태그 필터"><button className={!tag ? "active" : ""} aria-pressed={!tag} onClick={() => setTag("")}>전체</button>{tags.map((t) => <button key={t} className={tag === t ? "active" : ""} aria-pressed={tag === t} onClick={() => setTag(t)}>{t}</button>)}</div>
          <div className="list-heading"><span>나의 레시피 <strong>{filtered.length}</strong></span><select aria-label="레시피 정렬" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="title">가나다순</option><option value="recent">최신순</option><option value="tags">태그순</option></select></div>
        </div>
        <div className="recipe-list" aria-busy={loading}>
          {loading ? <div className="list-message" role="status"><span className="loading-dot" />레시피를 펼치고 있어요…</div> : error ? <div className="list-message" role="alert"><p>{error}</p><button className="solid-button" onClick={() => setReload((n) => n + 1)}>다시 불러오기</button></div> : <>
            {warning && <p className="load-warning" role="status">{warning} <button className="quiet-button" onClick={() => setReload((n) => n + 1)}>다시 시도</button></p>}
            {!filtered.length && <div className="list-message"><Icon name="search" size={28} /><p>{recipes.length ? "일치하는 레시피가 없어요." : "아직 모아둔 레시피가 없어요."}</p>{recipes.length > 0 && <button className="quiet-button" onClick={() => { setQuery(""); setTag(""); }}>검색과 필터 초기화</button>}</div>}
            {filtered.map((r) => <button key={r.id} className={`recipe-list-item ${r.id === selectedId ? "selected" : ""}`} aria-current={r.id === selectedId ? "true" : undefined} onClick={(e) => selectRecipe(r, e.currentTarget)}><RecipeImage recipe={r} className="list-thumbnail" /><span className="list-item-copy"><span className="list-item-title">{r.title}</span><span className="list-item-meta">{(r.tags || []).slice(0, 2).join(" · ") || `${r.base_servings || 1}인분`}{formatTimeTotal(r.time_total_min) && <span className="list-item-time">{formatTimeTotal(r.time_total_min)}</span>}</span></span><Icon name="arrow" size={15} /></button>)}
          </>}
        </div>
        <div className="sidebar-footer"><Icon name="book" size={14} /><span>나만의 작은 요리책</span><span>{recipes.length}개의 기록</span></div>
      </aside>
      <div className="detail-pane" ref={detailRef} tabIndex={-1}>
        <div className="detail-breadcrumb"><span>나의 레시피</span><Icon name="arrow" size={12} /><span>{selected?.title || "레시피북"}</span><span className="breadcrumb-right">MADE WITH CARE</span></div>
        {selected && !loading && !error ? <RecipeDetail key={selected.id} recipe={selected} onBack={showList} /> : <div className="detail-placeholder"><Icon name="book" size={42} /><h2>한 끼의 시작, 레시피북</h2><p>{loading ? "잠시만 기다려주세요. 요리책을 준비하고 있어요." : "목록에서 만들고 싶은 요리를 골라보세요."}</p></div>}
      </div>
    </div>
  );
}

export default function RecipeViewer({ recipe }) {
  return recipe ? <RecipeDetail key={recipe.id} recipe={recipe} /> : <RecipeLibrary />;
}
