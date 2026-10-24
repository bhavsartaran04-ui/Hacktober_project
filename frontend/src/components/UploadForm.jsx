import { useRef } from "react";
import { INDIAN_STATES } from "../data/indianStates.js";

const CROP_TYPES = ["kharif", "rabi", "zaid", "perennial", "other"];

export default function UploadForm({ t, busy, error, onFile, state, onStateChange, crop, onCropChange, soil, soilLoading, loadingText }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  function handleChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const typeOk =
      ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type);
    if (!typeOk) {
      onFile(null, "Choose a JPG, PNG, or WebP photo.");
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
      <label className="state-select-label" htmlFor="farm-state">{t.stateLabel}</label>
      <select id="farm-state" className="state-select" value={state} onChange={(event) => onStateChange(event.target.value)} disabled={busy}>
        <option value="">{t.statePlaceholder}</option>
        {INDIAN_STATES.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <p className="hint state-hint">{t.stateHint}</p>
      {soilLoading ? <p className="status">{t.soilLoading}</p> : null}
      {soil?.ok ? <p className="soil-preview">{t.soilPreview}: {soil.texture}</p> : null}
      {soil?.error ? <p className="hint">{t.soilUnavailable}</p> : null}

      <label className="state-select-label crop-label" htmlFor="farm-crop">{t.cropLabel}</label>
      <select id="farm-crop" className="state-select" value={crop} onChange={(event) => onCropChange(event.target.value)} disabled={busy}>
        <option value="">{t.cropPlaceholder}</option>
        {CROP_TYPES.map((type) => <option key={type} value={type}>{t[`cropType${type[0].toUpperCase()}${type.slice(1)}`]}</option>)}
      </select>
      <p className="hint state-hint">{t.cropHint}</p>
      {/* Hidden real file input */}
      <input
        ref={cameraRef}
        className="hidden-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        capture="environment"
        onChange={handleChange}
        disabled={busy || !state}
      />
      <input
        ref={galleryRef}
        className="hidden-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleChange}
        disabled={busy || !state}
      />

      {/* Big tap area */}
      <div
        className="upload-area"
        aria-disabled={busy || !state}
      >
        <span className="camera-icon">📷</span>
        <p>{t.cameraHint}</p>
        <div className="row upload-actions">
          <button type="button" className="btn btn-primary" disabled={busy || !state} onClick={() => cameraRef.current?.click()}>{t.takePhoto}</button>
          <button type="button" className="btn btn-secondary" disabled={busy || !state} onClick={() => galleryRef.current?.click()}>{t.choosePhoto}</button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {busy ? (
        <div className="loading-wrap">
          <div className="spinner" />
          <p className="status">{loadingText || t.loading}</p>
        </div>
      ) : null}
    </section>
  );
}
