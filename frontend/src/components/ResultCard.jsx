function Item({ title, value, tag, tagClass, big }) {
  return (
    <div className="result-item">
      <div className="result-head">
        <strong>{title}</strong>
        <em className={`tag ${tagClass || ""}`}>{tag}</em>
      </div>
      <p className={big ? "result-big" : "result-value"}>{value}</p>
    </div>
  );
}

export default function ResultCard({
  t,
  fields,
  tankLitres,
  calculation,
  llm,
  mixing,
  soil,
  state,
  crop,
  speechError,
  onListen,
  onStop,
  onBack,
  onRetry,
}) {
  const quantityText = calculation?.ok
    ? `${calculation.quantity} ${calculation.unit}`
    : calculation?.message || t.notVerified;

  const phiText = fields?.phi?.value?.trim() || t.notVerified;
  const reEntryText = fields?.reEntry?.value?.trim() || t.notVerified;
  const precautionText = fields?.precautions?.value?.trim() || t.notVerified;
  const mixingText =
    mixing?.status === "found" ? mixing.value : t.notVerified;
  const cropText = crop
    ? t[`cropType${crop[0].toUpperCase()}${crop.slice(1)}`]
    : t.cropNotSelected;

  const extractedSummary = [
    fields?.productName?.value,
    fields?.rate?.value,
    fields?.phi?.value,
    fields?.reEntry?.value,
    fields?.precautions?.value,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <section className="card">
      <h2>{t.resultTitle}</h2>
      <p className="hint">
        {t.productLabel}: {fields?.productName?.value || "—"} &nbsp;|&nbsp;
        {t.tankLabel}: {tankLitres} {t.tankCustom || "L"}
      </p>

      {/* Big quantity — the main result */}
      <Item
        title={t.quantity}
        value={quantityText}
        tag={t.sourceCalc}
        tagClass="tag-calc"
        big={calculation?.ok}
      />
      {calculation?.conversionLines?.map((line) => (
        <p key={line} className="conversion">{line}</p>
      ))}

      <Item title={t.phi} value={phiText} tag={t.sourceLabel} />
      <Item title={t.reEntry} value={reEntryText} tag={t.sourceLabel} />
      <Item title={t.precautions} value={precautionText} tag={t.sourceLabel} />
      <Item title={t.mixing} value={mixingText} tag={t.sourceLabel} />

      <div className="result-item">
        <div className="result-head"><strong>{t.soilReport}</strong><em className="tag">{t.sourceSoil}</em></div>
        <p className="result-value">{state}: {soil?.ok ? soil.texture : t.soilUnavailable}</p>
        <p className="result-value">{t.cropLabel}: {cropText}</p>
        {soil?.ok ? <p className="hint">{t.soilDetails}: {soil.clayPercent}% {t.clay}, {soil.sandPercent}% {t.sand}. {soil.estimate} <a href={soil.sourceUrl} target="_blank" rel="noreferrer">{soil.source}</a>.</p> : null}
        <p className="hint">{t.soilDoseNote}</p>
      </div>

      {llm?.ok ? (
        <Item
          title={t.explanation}
          value={llm.explanation}
          tag={t.sourceAi}
          tagClass="tag-ai"
        />
      ) : llm?.error ? (
        <div className="result-item">
          <div className="result-head">
            <strong>{t.explanation}</strong>
            <em className="tag tag-ai">{t.sourceAi}</em>
          </div>
          <p className="hint">{llm.error}</p>
          {extractedSummary ? <p className="result-value">{extractedSummary}</p> : null}
        </div>
      ) : null}

      {/* BIG Listen button */}
      <div style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn-listen" onClick={onListen}>
          {t.listen}
        </button>
      </div>
      {speechError ? <p className="speech-error">{speechError}</p> : null}
      <div className="row" style={{ marginTop: "0.5rem" }}>
        <button type="button" className="btn btn-stop" onClick={onStop}>
          {t.stop}
        </button>
      </div>

      <div className="row" style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t.back}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          {t.retry}
        </button>
      </div>
    </section>
  );
}
