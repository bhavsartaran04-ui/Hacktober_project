function Item({ title, body, tag }) {
  return (
    <div className="result-item">
      <div className="result-head">
        <strong>{title}</strong>
        <em className="tag">{tag}</em>
      </div>
      <p>{body}</p>
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
  speechError,
  onListen,
  onStop,
  onBack,
  onRetry,
}) {
  const quantityText = calculation?.ok
    ? `${calculation.quantity} ${calculation.unit}`
    : calculation?.message || "Could not verify";

  const phiText =
    fields?.phi?.value?.trim() || "Could not verify: PHI is missing from the label";
  const reEntryText =
    fields?.reEntry?.value?.trim() ||
    "Could not verify: re-entry interval is missing from the label";
  const precautionText =
    fields?.precautions?.value?.trim() ||
    "Could not verify: no precaution lines were found";
  const mixingText =
    mixing?.status === "found"
      ? mixing.value
      : "Could not verify";

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
        {t.productName}: {fields?.productName?.value || "—"} &nbsp;|&nbsp; Tank: {tankLitres} litres
      </p>

      <Item title={t.quantity} body={quantityText} tag={t.sourceCalc} />
      {calculation?.conversionLines?.map((line) => (
        <p key={line} className="hint">
          {line}
        </p>
      ))}

      <Item title={t.phi} body={phiText} tag={t.sourceLabel} />
      <Item title={t.reEntry} body={reEntryText} tag={t.sourceLabel} />
      <Item title={t.precautions} body={precautionText} tag={t.sourceLabel} />
      <Item title={t.mixing} body={mixingText} tag={t.sourceLabel} />

      <div className="result-item">
        <div className="result-head">
          <strong>{t.explanation}</strong>
          <em className="tag">{t.sourceAi}</em>
        </div>
        {llm?.ok ? (
          <p>{llm.explanation}</p>
        ) : (
          <>
            <p className="hint">{llm?.error}</p>
            {extractedSummary ? (
              <p>{extractedSummary}</p>
            ) : (
              <p className="hint">No extracted summary is available.</p>
            )}
          </>
        )}
      </div>

      <div className="row">
        <button type="button" onClick={onListen}>
          {t.listen}
        </button>
        <button type="button" className="secondary" onClick={onStop}>
          {t.stop}
        </button>
      </div>
      {speechError ? <p className="error">{speechError}</p> : null}

      <div className="row">
        <button type="button" className="secondary" onClick={onBack}>
          {t.back}
        </button>
        <button type="button" className="secondary" onClick={onRetry}>
          {t.retry}
        </button>
      </div>
    </section>
  );
}
