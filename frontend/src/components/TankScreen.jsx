import { useState } from "react";

const PRESETS = [10, 15, 16, 20];

export default function TankScreen({ t, busy, error, onCalculate, onBack }) {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState("");

  const activeLitres = selected || (custom !== "" ? Number(custom) : null);

  function handlePreset(litres) {
    setSelected(litres);
    setCustom("");
  }

  function handleCustom(val) {
    setCustom(val);
    setSelected(null);
  }

  function handleSubmit() {
    if (activeLitres && Number.isFinite(activeLitres) && activeLitres > 0) {
      onCalculate(activeLitres);
    }
  }

  return (
    <section className="card">
      <h2>{t.tankTitle}</h2>

      <div className="tank-presets">
        {PRESETS.map((litres) => (
          <button
            type="button"
            key={litres}
            className={`tank-btn${selected === litres ? " active" : ""}`}
            onClick={() => handlePreset(litres)}
          >
            🪣 {litres} {t.tankCustom}
          </button>
        ))}
      </div>

      <div className="tank-custom">
        <span>{t.tankOther}:</span>
        <input
          type="number"
          inputMode="decimal"
          min="1"
          max="10000"
          value={custom}
          placeholder="—"
          onChange={(e) => handleCustom(e.target.value)}
        />
        <span>{t.tankCustom}</span>
      </div>

      {error ? <p className="error" style={{ marginTop: "0.75rem" }}>{error}</p> : null}

      {busy ? (
        <div className="loading-wrap">
          <div className="spinner" />
          <p className="status">{t.loading}</p>
        </div>
      ) : (
        <div className="row" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
          >
            {t.back}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!activeLitres || activeLitres <= 0 || busy}
            onClick={handleSubmit}
          >
            {t.calculate}
          </button>
        </div>
      )}
    </section>
  );
}
