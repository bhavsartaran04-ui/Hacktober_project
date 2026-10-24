export default function LanguageSelect({ language, onChange, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={language}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी (Hindi)</option>
      </select>
    </label>
  );
}
