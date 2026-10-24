const PRESETS = [10, 15, 16, 20];

export default function TankScreen({ t, busy, error, onCalculate, onBack, tankLitres, onTankChange }) {
  const activeLitres = tankLitres !== "" ? Number(tankLitres) : null;
  const presetSelected = PRESETS.includes(activeLitres);
  const overLimit = Number.isFinite(activeLitres) && activeLitres > 10000;

  function handlePreset(litres) {
    onTankChange(String(litres));
  }

  function handleCustom(val) {
    onTankChange(val);
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
            className={`tank-btn${activeLitres === litres ? " active" : ""}`}
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
          value={presetSelected ? "" : tankLitres}
          placeholder="—"
          onChange={(e) => handleCustom(e.target.value)}
        />
        <span>{t.tankCustom}</span>
      </div>

      {overLimit ? <p className="error">{t.tankOverLimit}</p> : null}
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
            disabled={!activeLitres || activeLitres <= 0 || overLimit || busy}
            onClick={handleSubmit}
          >
            {t.calculate}
          </button>
        </div>
      )}
    </section>
  );
}
