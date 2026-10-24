import { useState } from "react";
import SummaryPanel from "./SummaryPanel.jsx";

function Field({ label, statusLabel, snippet, sourceLabel, children }) {
  return (
    <label className="field">
      <span className="field-heading">
        <span>{label}</span>
        <em className="tag">{statusLabel}</em>
      </span>
      {children}
      {snippet ? <small className="field-snippet">{sourceLabel}: {snippet}</small> : null}
    </label>
  );
}

export default function ConfirmFields({ t, fields, ocr, summary, imagePreview, onChange, onContinue, onBack }) {
  const [reviewed, setReviewed] = useState(false);
  const statusText = (field) => {
    if (field?.status === "edited") return t.userEdited;
    if (field?.status === "uncertain") return t.uncertain;
    return field?.status === "found" ? t.sourceLabel : t.notFound;
  };
  const setField = (path, value) => onChange(path, value);
  const rateStatus = statusText(fields.rate);

  return (
    <section className="card confirm-card">
      <h2>{t.confirmTitle}</h2>
      <p className="hint">{t.confirmHint}</p>
      {imagePreview ? <img className="label-preview" src={imagePreview} alt={t.labelPhotoPreview} /> : null}
      {ocr?.lowConfidence ? <p className="error confirm-warning">{t.ocrLow} {t.confirmLowConfidence}</p> : null}
      {summary ? <SummaryPanel t={t} summary={summary} compact /> : null}

      <details className="ocr-original">
        <summary>{t.originalText} ({ocr?.confidence ?? 0}%)</summary>
        <pre>{ocr?.text || t.noOcrText}</pre>
      </details>

      <Field label={t.productName} statusLabel={statusText(fields.productName)} sourceLabel={t.sourceLabel} snippet={fields.productName?.snippet}>
        <input value={fields.productName?.value || ""} onChange={(e) => setField("productName.value", e.target.value)} />
      </Field>
      <Field label={t.activeIngredient} statusLabel={statusText(fields.activeIngredient)} sourceLabel={t.sourceLabel} snippet={fields.activeIngredient?.snippet}>
        <input value={fields.activeIngredient?.value || ""} onChange={(e) => setField("activeIngredient.value", e.target.value)} />
      </Field>
      <div className="grid2">
        <Field label={t.labelCrop} statusLabel={statusText(fields.targetCrop)} sourceLabel={t.sourceLabel} snippet={fields.targetCrop?.snippet}>
          <input value={fields.targetCrop?.value || ""} onChange={(e) => setField("targetCrop.value", e.target.value)} />
        </Field>
        <Field label={t.targetPest} statusLabel={statusText(fields.targetPest)} sourceLabel={t.sourceLabel} snippet={fields.targetPest?.snippet}>
          <input value={fields.targetPest?.value || ""} onChange={(e) => setField("targetPest.value", e.target.value)} />
        </Field>
      </div>

      <h3 className="confirm-section-title">{t.applicationRate}</h3>
      <div className="grid2">
        <Field label={t.rateAmount} statusLabel={rateStatus} sourceLabel={t.sourceLabel} snippet={fields.rate?.snippet}>
          <input inputMode="decimal" value={fields.rate?.amount ?? ""} onChange={(e) => setField("rate.amount", e.target.value)} />
        </Field>
        <Field label={t.rateUnit} statusLabel={rateStatus} sourceLabel={t.sourceLabel} snippet={fields.rate?.snippet}>
          <input value={fields.rate?.unit || ""} onChange={(e) => setField("rate.unit", e.target.value)} />
        </Field>
        <Field label={t.perAmount} statusLabel={rateStatus} sourceLabel={t.sourceLabel} snippet={fields.rate?.snippet}>
          <input inputMode="decimal" value={fields.rate?.perAmount ?? ""} onChange={(e) => setField("rate.perAmount", e.target.value)} />
        </Field>
        <Field label={t.perUnit} statusLabel={rateStatus} sourceLabel={t.sourceLabel} snippet={fields.rate?.snippet}>
          <input value={fields.rate?.perUnit || ""} onChange={(e) => setField("rate.perUnit", e.target.value)} />
        </Field>
      </div>

      <Field label={t.phi} statusLabel={statusText(fields.phi)} sourceLabel={t.sourceLabel} snippet={fields.phi?.snippet}>
        <input value={fields.phi?.value || ""} onChange={(e) => setField("phi.value", e.target.value)} />
      </Field>
      <Field label={t.reEntry} statusLabel={statusText(fields.reEntry)} sourceLabel={t.sourceLabel} snippet={fields.reEntry?.snippet}>
        <input value={fields.reEntry?.value || ""} onChange={(e) => setField("reEntry.value", e.target.value)} />
      </Field>
      <Field label={t.precautions} statusLabel={statusText(fields.precautions)} sourceLabel={t.sourceLabel} snippet={fields.precautions?.snippet}>
        <textarea rows={4} value={fields.precautions?.value || ""} onChange={(e) => setField("precautions.value", e.target.value)} />
      </Field>
      <Field label={t.firstAid} statusLabel={statusText(fields.firstAid)} sourceLabel={t.sourceLabel} snippet={fields.firstAid?.snippet}>
        <textarea rows={3} value={fields.firstAid?.value || ""} onChange={(e) => setField("firstAid.value", e.target.value)} />
      </Field>
      <Field label={t.warnings} statusLabel={statusText(fields.warnings)} sourceLabel={t.sourceLabel} snippet={fields.warnings?.snippet}>
        <textarea rows={3} value={fields.warnings?.value || ""} onChange={(e) => setField("warnings.value", e.target.value)} />
      </Field>
      <Field label={t.tankInstructions} statusLabel={statusText(fields.tankInstructions)} sourceLabel={t.sourceLabel} snippet={fields.tankInstructions?.snippet}>
        <textarea rows={2} value={fields.tankInstructions?.value || ""} onChange={(e) => setField("tankInstructions.value", e.target.value)} />
      </Field>
      <Field label={t.mixing} statusLabel={statusText(fields.mixing)} sourceLabel={t.sourceLabel} snippet={fields.mixing?.snippet}>
        <input value={fields.mixing?.value || ""} onChange={(e) => setField("mixing.value", e.target.value)} />
      </Field>

      <label className="review-check">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
        <span>{t.confirmReview}</span>
      </label>
      <div className="row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>{t.retake}</button>
        <button type="button" className="btn btn-primary" disabled={!reviewed} onClick={onContinue}>{t.continue}</button>
      </div>
    </section>
  );
}
