import React, { useMemo } from "react";
import RecipeViewer from "./components/RecipeViewer";
import { useMediaQuery } from "./lib/useMediaQuery";

export default function App() {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const styles = useMemo(() => {
    const pagePadding = isMobile ? 10 : 16;

    return {
      page: {
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: pagePadding,
        background: "#0b0d12",
        color: "#e8ecf3",
        height: "100vh",
        overflow: "hidden", // body 스크롤 제거
        display: "flex",
        flexDirection: "column",
        gap: 12,
      },
      header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "stretch" : "center",
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
        padding: 12,
        borderRadius: 16,
        background: "#121623",
        border: "1px solid #1f263a",
        flexShrink: 0,
      },
      brand: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
      logo: {
        width: 44,
        height: 44,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        background: "#1a2140",
        border: "1px solid #2a3566",
        fontSize: 22,
        flex: "0 0 auto",
      },
      title: { fontWeight: 800, fontSize: isMobile ? 16 : 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      subTitle: { opacity: 0.75, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

      main: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "auto",
      },
      content: {
        minHeight: 0,
        height: "100%",
      },
    };
  }, [isMobile]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>🍲</div>
          <div>
            <div style={styles.title}>레시피북</div>
            <div style={styles.subTitle}>파일 기반 레시피 뷰어</div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.content}>
          <RecipeViewer />
        </section>
      </main>
    </div>
  );
}
