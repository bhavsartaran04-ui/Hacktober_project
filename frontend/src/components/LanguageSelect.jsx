export default function LanguageSelect({ language, onChange, t, disabled = false }) {
  return (
    <div className="lang-buttons" role="group" aria-label={t.language}>
      <button
        type="button"
        className={`lang-btn${language === "en" ? " active" : ""}`}
        onClick={() => onChange("en")}
        disabled={disabled}
        aria-pressed={language === "en"}
      >
        {t.langEn}
      </button>
      <button
        type="button"
        className={`lang-btn${language === "hi" ? " active" : ""}`}
        onClick={() => onChange("hi")}
        disabled={disabled}
        aria-pressed={language === "hi"}
      >
        {t.langHi}
      </button>
    </div>
  );
}
