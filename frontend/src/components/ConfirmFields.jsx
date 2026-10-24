function Field({ label, statusLabel, children }) {
  return (
    <label className="field">
      <span>
        {label}{" "}
        <em className="tag">{statusLabel}</em>
      </span>
      {children}
    </label>
  );
}

export default function ConfirmFields({ t, fields, onChange, onContinue, onBack }) {
  function setField(path, value) {
    onChange(path, value);
  }

  const rateStatus =
    fields.rate?.status === "found" ? t.sourceLabel : t.notFound;

  return (
    <section className="card">
      <h2>{t.confirmTitle}</h2>
      <p className="hint">{t.confirmHint}</p>

      <Field label={t.productName} statusLabel={fields.productName?.status === "found" ? t.sourceLabel : t.notFound}>
        <input
          value={fields.productName?.value || ""}
          onChange={(e) => setField("productName.value", e.target.value)}
        />
      </Field>

      <div className="grid2">
        <Field label={t.rateAmount} statusLabel={rateStatus}>
          <input
            inputMode="decimal"
            value={fields.rate?.amount ?? ""}
            onChange={(e) => setField("rate.amount", e.target.value)}
          />
        </Field>
        <Field label={t.rateUnit} statusLabel={rateStatus}>
          <input
            value={fields.rate?.unit || ""}
            onChange={(e) => setField("rate.unit", e.target.value)}
          />
        </Field>
        <Field label={t.perAmount} statusLabel={rateStatus}>
          <input
            inputMode="decimal"
            value={fields.rate?.perAmount ?? ""}
            onChange={(e) => setField("rate.perAmount", e.target.value)}
          />
        </Field>
        <Field label={t.perUnit} statusLabel={rateStatus}>
          <input
            value={fields.rate?.perUnit || ""}
            onChange={(e) => setField("rate.perUnit", e.target.value)}
          />
        </Field>
      </div>

      <Field label={t.phi} statusLabel={fields.phi?.status === "found" ? t.sourceLabel : t.notFound}>
        <input
          value={fields.phi?.value || ""}
          onChange={(e) => setField("phi.value", e.target.value)}
        />
      </Field>

      <Field
        label={t.reEntry}
        statusLabel={fields.reEntry?.status === "found" ? t.sourceLabel : t.notFound}
      >
        <input
          value={fields.reEntry?.value || ""}
          onChange={(e) => setField("reEntry.value", e.target.value)}
        />
      </Field>

      <Field
        label={t.precautions}
        statusLabel={fields.precautions?.status === "found" ? t.sourceLabel : t.notFound}
      >
        <textarea
          rows={4}
          value={fields.precautions?.value || ""}
          onChange={(e) => setField("precautions.value", e.target.value)}
        />
      </Field>

      <Field
        label={t.tankInstructions}
        statusLabel={
          fields.tankInstructions?.status === "found" ? t.sourceLabel : t.notFound
        }
      >
        <textarea
          rows={2}
          value={fields.tankInstructions?.value || ""}
          onChange={(e) => setField("tankInstructions.value", e.target.value)}
        />
      </Field>

      <Field
        label={t.mixing}
        statusLabel={
          fields.mixing?.status === "found" ? t.sourceLabel : t.notFound
        }
      >
        <input
          value={fields.mixing?.value || ""}
          onChange={(e) => setField("mixing.value", e.target.value)}
        />
      </Field>

      <div className="row">
        <button type="button" className="secondary" onClick={onBack}>
          {t.back}
        </button>
        <button type="button" onClick={onContinue}>
          {t.continue}
        </button>
      </div>
    </section>
  );
}
