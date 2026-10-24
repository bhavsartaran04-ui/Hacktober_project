export default function LanguageSelect({ language, onChange, t, disabled = false }) {
  return (
    <div className="lang-buttons">
      <button
        type="button"
        className={`lang-btn${language === "en" ? " active" : ""}`}
        onClick={() => onChange("en")}
        disabled={disabled}
      >
        {t.langEn}
      </button>
      <button
        type="button"
        className={`lang-btn${language === "hi" ? " active" : ""}`}
        onClick={() => onChange("hi")}
        disabled={disabled}
      >
        {t.langHi}
      </button>
    </div>
  );
}
