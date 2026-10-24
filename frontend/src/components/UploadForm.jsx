import { useRef } from "react";

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const CROP_TYPES = ["kharif", "rabi", "zaid", "perennial", "other"];

export default function UploadForm({ t, busy, error, onFile, state, onStateChange, crop, onCropChange, soil, soilLoading }) {
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
        onClick={() => !busy && state && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (state && !busy) inputRef.current?.click();
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
      ) : null}
    </section>
  );
}
