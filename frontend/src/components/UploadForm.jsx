export default function UploadForm({ t, busy, error, onFile, onDemo }) {
  function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const typeOk =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/jpg";
    if (!typeOk) {
      onFile(null, "Only JPG and PNG images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onFile(null, "File is larger than 5 MB.");
      return;
    }
    onFile(file);
  }

  return (
    <section className="card">
      <h2>{t.upload}</h2>
      <p className="hint">{t.uploadHint}</p>
      <input
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        capture="environment"
        onChange={handleChange}
        disabled={busy}
      />
      {error ? <p className="error">{error}</p> : null}
      {busy ? <p className="status">{t.loading}</p> : null}
      <div className="row">
        <button type="button" disabled={busy} onClick={() => onDemo("full")}>
          {t.demo}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => onDemo("missing")}
        >
          {t.demoMissing}
        </button>
      </div>
    </section>
  );
}
