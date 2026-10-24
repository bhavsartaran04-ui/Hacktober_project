import SummaryPanel from "./SummaryPanel.jsx";

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
  summary,
  tankLitres,
  calculation,
  llm,
  mixing,
  soil,
  state,
  crop,
  busy,
  speechError,
  onListen,
  onStop,
  onBack,
  onRetry,
}) {
  const quantityText = calculation?.ok
    ? `${calculation.quantity} ${calculation.unit}`
    : calculation?.message || t.notVerified;

  const sourceStatus = (field) =>
    field?.status === "edited" ? t.userEdited : field?.status === "found" ? t.sourceLabel : field?.status === "uncertain" ? t.uncertain : t.notFound;
  const fieldText = (field) => field?.status === "uncertain"
    ? t.uncertainValue
    : field?.value?.trim() || t.notVerified;
  const mixingText =
    mixing?.status === "uncertain" ? t.uncertainValue : mixing?.status === "found" || mixing?.status === "edited" ? mixing.value : t.notVerified;
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
      {busy ? <p className="status" aria-live="polite">{t.updating}</p> : null}
      <p className="hint">
        {t.productLabel}: {fields?.productName?.value || "—"} &nbsp;|&nbsp;
        {t.tankLabel}: {tankLitres} {t.tankCustom || "L"}
      </p>

      {summary ? (
        <SummaryPanel t={t} summary={summary} tankLitres={tankLitres} />
      ) : (
        <Item
          title={t.quantity}
          value={quantityText}
          tag={calculation?.ok ? t.sourceCalc : t.sourceUnverified}
          tagClass={calculation?.ok ? "tag-calc" : ""}
          big={calculation?.ok}
        />
      )}
      {calculation?.conversionLines?.map((line) => (
        <p key={line} className="conversion">{line}</p>
      ))}

      {fields?.activeIngredient?.value ? <Item title={t.activeIngredient} value={fields.activeIngredient.value} tag={sourceStatus(fields.activeIngredient)} /> : null}
      {fields?.targetCrop?.value ? <Item title={t.labelCrop} value={fields.targetCrop.value} tag={sourceStatus(fields.targetCrop)} /> : null}
      {fields?.targetPest?.value ? <Item title={t.targetPest} value={fields.targetPest.value} tag={sourceStatus(fields.targetPest)} /> : null}
      <Item title={t.phi} value={fieldText(fields?.phi)} tag={sourceStatus(fields?.phi)} />
      <Item title={t.reEntry} value={fieldText(fields?.reEntry)} tag={sourceStatus(fields?.reEntry)} />
      <Item title={t.precautions} value={fieldText(fields?.precautions)} tag={sourceStatus(fields?.precautions)} />
      <Item title={t.firstAid} value={fieldText(fields?.firstAid)} tag={sourceStatus(fields?.firstAid)} />
      <Item title={t.warnings} value={fieldText(fields?.warnings)} tag={sourceStatus(fields?.warnings)} />
      <Item title={t.mixing} value={mixingText} tag={sourceStatus(fields?.mixing)} />

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
        <button type="button" className="btn btn-listen" onClick={onListen} disabled={busy}>
          {t.listen}
        </button>
      </div>
      {speechError ? <p className="speech-error">{speechError}</p> : null}
      <div className="row" style={{ marginTop: "0.5rem" }}>
        <button type="button" className="btn btn-stop" onClick={onStop} disabled={busy}>
          {t.stop}
        </button>
      </div>

      <div className="row" style={{ marginTop: "0.75rem" }}>
        <button type="button" className="btn btn-secondary" onClick={onBack} disabled={busy}>
          {t.back}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onRetry} disabled={busy}>
          {t.retry}
        </button>
      </div>
    </section>
  );
}
