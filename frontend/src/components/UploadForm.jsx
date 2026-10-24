import { useRef } from "react";

export default function UploadForm({ t, busy, error, onFile, onDemo }) {
  const inputRef = useRef(null);

  function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const typeOk =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/jpg";
    if (!typeOk) {
      onFile(null, "Only JPG / PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onFile(null, "File too big (max 5 MB)");
      return;
    }
    onFile(file);
  }

  return (
    <section className="card">
      {/* Hidden real file input */}
      <input
        ref={inputRef}
        className="hidden-input"
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        capture="environment"
        onChange={handleChange}
        disabled={busy}
      />

      {/* Big tap area */}
      <div
        className="upload-area"
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <span className="camera-icon">📷</span>
        <p>{t.cameraHint}</p>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {busy ? (
        <div className="loading-wrap">
          <div className="spinner" />
          <p className="status">{t.loading}</p>
        </div>
      ) : (
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => onDemo("full")}
          >
            {t.demo}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => onDemo("missing")}
          >
            {t.demoMissing}
          </button>
        </div>
      )}
    </section>
  );
}
