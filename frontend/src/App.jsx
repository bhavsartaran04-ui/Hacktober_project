import { useMemo, useState } from "react";
import LanguageSelect from "./components/LanguageSelect.jsx";
import SafetyBanner from "./components/SafetyBanner.jsx";
import UploadForm from "./components/UploadForm.jsx";
import ConfirmFields from "./components/ConfirmFields.jsx";
import ResultCard from "./components/ResultCard.jsx";
import { extractLabel, fetchResult } from "./services/api.js";
import { getSpeechSupport, speakText, stopSpeaking } from "./services/speech.js";
import { copy } from "./utils/copy.js";

function setDeep(obj, path, value) {
  const parts = path.split(".");
  const next = structuredClone(obj);
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor[parts[i]] = cursor[parts[i]] || {};
    cursor = cursor[parts[i]];
  }
  const last = parts[parts.length - 1];
  cursor[last] =
    last === "amount" || last === "perAmount"
      ? value === ""
        ? ""
        : value
      : value;

  // When user edits a value field, mark the parent status as "found"
  // so the tag updates from "not found" → "From label" in the UI.
  if (last === "value" && value.trim() !== "") {
    cursor.status = "found";
  }

  if (path.startsWith("rate.")) {
    const amount = next.rate.amount;
    const unit = next.rate.unit;
    const perAmount = next.rate.perAmount;
    const perUnit = next.rate.perUnit;
    next.rate.value =
      amount && unit && perAmount && perUnit
        ? `${amount} ${unit} per ${perAmount} ${perUnit}`
        : "";
    // Mark rate as found if all subfields are filled
    if (amount && unit && perAmount && perUnit) {
      next.rate.status = "found";
    }
  }
  return next;
}

export default function App() {
  const [language, setLanguage] = useState("en");
  const [screen, setScreen] = useState("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [slowMessage, setSlowMessage] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [ocr, setOcr] = useState(null);
  const [fields, setFields] = useState(null);
  const [tankLitres, setTankLitres] = useState("");
  const [tankError, setTankError] = useState("");
  const [calculation, setCalculation] = useState(null);
  const [llm, setLlm] = useState(null);
  const [mixing, setMixing] = useState(null);
  const [speechError, setSpeechError] = useState("");

  const t = useMemo(() => copy[language] || copy.en, [language]);

  async function runExtract(file, demoFlag) {
    setBusy(true);
    setError("");
    setSlowMessage("");
    const result = await extractLabel(file, {
      onSlow: (msg) => setSlowMessage(msg),
    });
    setBusy(false);
    setSlowMessage("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOcr(result.ocr);
    setFields(result.fields);
    setIsDemo(Boolean(result.isDemo || demoFlag));
    setScreen("confirm");
  }

  async function handleDemo(kind) {
    const path =
      kind === "missing" ? "/demo/demo-missing-rate.png" : "/demo/demo-full.png";
    try {
      const res = await fetch(path);
      if (!res.ok) {
        setError("Could not load the DEMO label image. Make sure the demo files are in frontend/public/demo/.");
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], path.split("/").pop(), { type: "image/png" });
      await runExtract(file, true);
    } catch {
      setError("Could not load the DEMO label image.");
    }
  }

  function validateTank() {
    if (tankLitres === "") {
      setTankError("Could not verify: tank capacity is blank");
      return false;
    }
    const n = Number(tankLitres);
    if (!Number.isFinite(n)) {
      setTankError("Could not verify: tank capacity is not a number");
      return false;
    }
    if (n === 0) {
      setTankError("Could not verify: tank capacity is 0");
      return false;
    }
    if (n < 0) {
      setTankError("Could not verify: tank capacity is negative");
      return false;
    }
    if (n > 10000) {
      setTankError("Could not verify: tank capacity is above 10,000 litres");
      return false;
    }
    setTankError("");
    return true;
  }

  async function runResult() {
    if (!validateTank()) return;
    setBusy(true);
    setError("");
    setSlowMessage("");
    const result = await fetchResult(
      {
        language,
        confirmed: true,
        tankLitres: Number(tankLitres),
        fields,
      },
      { onSlow: (msg) => setSlowMessage(msg) },
    );
    setBusy(false);
    setSlowMessage("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCalculation(result.calculation);
    setLlm(result.llm);
    setMixing(result.mixing);
    setScreen("result");
  }

  function handleListen() {
    if (!getSpeechSupport()) {
      setSpeechError("This browser cannot read aloud (no Web Speech API).");
      return;
    }
    const parts = [
      calculation?.ok
        ? `${calculation.quantity} ${calculation.unit}`
        : calculation?.message,
      fields?.phi?.value,
      fields?.reEntry?.value,
      fields?.precautions?.value,
      llm?.ok ? llm.explanation : "",
    ].filter(Boolean);
    const spoken = speakText(parts.join(". "), language);
    setSpeechError(spoken.ok ? "" : spoken.error);
  }

  function resetAll() {
    stopSpeaking();
    setScreen("upload");
    setError("");
    setFields(null);
    setOcr(null);
    setCalculation(null);
    setLlm(null);
    setMixing(null);
    setTankLitres("");
    setTankError("");
    setSpeechError("");
    setIsDemo(false);
  }

  // Summary of confirmed fields for the tank screen
  const fieldsSummary =
    fields && screen === "tank"
      ? [
          fields.productName?.value && `${t.productName}: ${fields.productName.value}`,
          fields.rate?.value && `${t.rateAmount}: ${fields.rate.value}`,
          fields.phi?.value && `${t.phi}: ${fields.phi.value}`,
          fields.reEntry?.value && `${t.reEntry}: ${fields.reEntry.value}`,
        ].filter(Boolean)
      : [];

  return (
    <main className="page">
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>
      <LanguageSelect
        language={language}
        onChange={setLanguage}
        label={t.language}
      />
      {isDemo ? <p className="demo-flag">{t.demoBanner}</p> : null}
      <SafetyBanner text={t.disclaimer} />
      {slowMessage ? <p className="status">{slowMessage}</p> : null}
      {ocr?.lowConfidence && screen !== "upload" ? (
        <p className="error">{t.ocrLow}</p>
      ) : null}

      {screen === "upload" ? (
        <UploadForm
          t={t}
          busy={busy}
          error={error}
          onFile={(file, message) => {
            if (message) setError(message);
            else runExtract(file, false);
          }}
          onDemo={handleDemo}
        />
      ) : null}

      {screen === "confirm" && fields ? (
        <ConfirmFields
          t={t}
          fields={fields}
          onChange={(path, value) => setFields((prev) => setDeep(prev, path, value))}
          onContinue={() => setScreen("tank")}
          onBack={resetAll}
        />
      ) : null}

      {screen === "tank" ? (
        <section className="card">
          <h2>{t.tankTitle}</h2>
          {fieldsSummary.length > 0 ? (
            <ul className="confirmed-summary">
              {fieldsSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <p className="hint">{t.tankHint}</p>
          <label className="field">
            <span>{t.tankLabel}</span>
            <input
              inputMode="decimal"
              value={tankLitres}
              onChange={(e) => setTankLitres(e.target.value)}
            />
          </label>
          {tankError ? <p className="error">{tankError}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {busy ? <p className="status">{t.loading}</p> : null}
          <div className="row">
            <button
              type="button"
              className="secondary"
              onClick={() => setScreen("confirm")}
            >
              {t.back}
            </button>
            <button type="button" disabled={busy} onClick={runResult}>
              {t.calculate}
            </button>
          </div>
        </section>
      ) : null}

      {screen === "result" ? (
        <ResultCard
          t={t}
          fields={fields}
          tankLitres={tankLitres}
          calculation={calculation}
          llm={llm}
          mixing={mixing}
          speechError={speechError}
          onListen={handleListen}
          onStop={stopSpeaking}
          onBack={() => setScreen("tank")}
          onRetry={resetAll}
        />
      ) : null}
    </main>
  );
}
