export default function LanguageSelect({ language, onChange, t }) {
  return (
    <div className="lang-buttons">
      <button
        type="button"
        className={`lang-btn${language === "en" ? " active" : ""}`}
        onClick={() => onChange("en")}
      >
        {t.langEn}
      </button>
      <button
        type="button"
        className={`lang-btn${language === "hi" ? " active" : ""}`}
        onClick={() => onChange("hi")}
      >
        {t.langHi}
      </button>
    </div>
  );
}
