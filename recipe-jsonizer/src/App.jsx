import RecipeViewer from "./components/RecipeViewer";
import Icon from "./components/Icon";

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="레시피북 홈">
          <span className="brand-symbol"><Icon name="book" size={25} /></span>
          <span>레시피북<span className="brand-en">MY RECIPE BOOK</span></span>
        </a>
        <span className="header-note">좋아하는 맛을 모아두는 곳<span className="header-note-line" /></span>
      </header>
      <main><RecipeViewer /></main>
    </div>
  );
}
