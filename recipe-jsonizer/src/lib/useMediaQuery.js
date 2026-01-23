import { useEffect, useState } from "react";

/**
 * React hook: media query match 상태를 구독
 * - SSR은 고려하지 않는(현재 Vite CSR) 전제
 */
export function useMediaQuery(query) {
  const getMatch = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (!window.matchMedia) return;

    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    // 초기값 동기화
    onChange();

    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}
