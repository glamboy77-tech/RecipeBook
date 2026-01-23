import React, { useState } from "react";
import RecipeViewer from "./components/RecipeViewer";
import RecipeConverter from "./components/RecipeConverter";

export default function App() {
  // UI tab
  const [tab, setTab] = useState("viewer"); // "viewer" | "converter"

  // Converter -> download recipe as JSON file
  const addRecipeFromJsonObject = (obj) => {
    try {
      // 파일 이름 생성
      const fileName = `${obj.title || obj.recipe_name || "레시피"}_${obj.id || Date.now()}.json`;
      const safeFileName = fileName.replace(/[^\w\u4e00-\u9fa5\-_.]/g, "_");
      
      // JSON 파일 생성 및 다운로드
      const jsonString = JSON.stringify(obj, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = safeFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`레시피가 "${safeFileName}" 파일로 다운로드되었습니다!\n\npublic/recipes/ 폴더에 추가하면 뷰어에서 바로 볼 수 있습니다.`);
    } catch (error) {
      console.error("다운로드 실패:", error);
      alert("파일 다운로드에 실패했습니다.");
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>🍲</div>
          <div>
            <div style={styles.title}>레시피 뷰어 + 변환기</div>
            <div style={styles.subTitle}>요리할 땐 뷰어 / 평소엔 변환기</div>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tabBtn, ...(tab === "viewer" ? styles.tabActive : {}) }}
            onClick={() => setTab("viewer")}
          >
            뷰어
          </button>
          <button
            style={{ ...styles.tabBtn, ...(tab === "converter" ? styles.tabActive : {}) }}
            onClick={() => setTab("converter")}
          >
            변환기
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.content}>
          {tab === "viewer" ? (
            <RecipeViewer />
          ) : (
            <RecipeConverter
              onCreate={(recipeObj) => addRecipeFromJsonObject(recipeObj)}
            />
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: { 
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", 
    padding: 16, 
    background: "#0b0d12", 
    color: "#e8ecf3", 
    height: "100vh",
    overflow: "hidden" // body 스크롤 제거
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    gap: 12, 
    padding: 12, 
    borderRadius: 16, 
    background: "#121623", 
    border: "1px solid #1f263a",
    flexShrink: 0 // header가 축소되지 않도록
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "#1a2140", border: "1px solid #2a3566", fontSize: 22 },
  title: { fontWeight: 800, fontSize: 18 },
  subTitle: { opacity: 0.75, fontSize: 12, marginTop: 2 },
  tabs: { display: "flex", gap: 8 },
  // React 경고 방지: border(축약) + borderColor(비축약) 혼용 금지
  tabBtn: { padding: "10px 14px", borderRadius: 12, borderWidth: 1, borderStyle: "solid", borderColor: "#2a3566", background: "#151a2a", color: "#e8ecf3", cursor: "pointer" },
  tabActive: { background: "#1a2140", borderColor: "#3b4aa3" },

  main: { 
    display: "flex",
    flexDirection: "column",
    minHeight: 0, // Grid/Flex 자식이 overflow를 제대로 먹도록
    height: "calc(100vh - 16px - 16px - 72px - 12px)", // page padding + header height + main padding
    overflow: "auto" // 여기만 스크롤 허용
  },
  content: { 
    minHeight: 0, // 자식이 overflow를 제대로 먹도록
    height: "100%" // 부모(main)의 높이를 꽉 채움
  },
};
