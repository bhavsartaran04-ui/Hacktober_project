import { useMemo, useRef, useState } from "react";
import LanguageSelect from "./components/LanguageSelect.jsx";
import SafetyBanner from "./components/SafetyBanner.jsx";
import UploadForm from "./components/UploadForm.jsx";
import ConfirmFields from "./components/ConfirmFields.jsx";
import TankScreen from "./components/TankScreen.jsx";
import ResultCard from "./components/ResultCard.jsx";
import { extractLabel, fetchResult, fetchSoil } from "./services/api.js";
import { getSpeechSupport, speakText, stopSpeaking } from "./services/speech.js";
import { copy } from "./utils/copy.js";

export default function App() {
  const [language, setLanguage] = useState("en");
  const [screen, setScreen] = useState("upload"); // upload → confirm → tank → result
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [slowMessage, setSlowMessage] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [ocr, setOcr] = useState(null);
  const [fields, setFields] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tankLitres, setTankLitres] = useState(null);
  const [tankInput, setTankInput] = useState("");
  const [calculation, setCalculation] = useState(null);
  const [llm, setLlm] = useState(null);
  const [mixing, setMixing] = useState(null);
  const [speechError, setSpeechError] = useState("");
  const [state, setState] = useState("");
  const [soil, setSoil] = useState(null);
  const [crop, setCrop] = useState("");
  const [soilLoading, setSoilLoading] = useState(false);
  const soilRequestId = useRef(0);
  const resultRequestId = useRef(0);
  const imagePreviewUrl = useRef("");
  const [imagePreview, setImagePreview] = useState("");

  const t = useMemo(() => copy[language] || copy.en, [language]);
  const currentStep = { upload: 1, confirm: 2, tank: 3, result: 4 }[screen];
  const steps = [
    t.stepRead,
    t.stepReview,
    t.stepTank,
    t.stepResult,
  ];

  async function handleStateChange(nextState) {
    const requestId = ++soilRequestId.current;
    setState(nextState);
    setSoil(null);
    if (!nextState) {
      setSoilLoading(false);
      return;
    }
    setSoilLoading(true);
    const result = await fetchSoil(nextState);
    if (requestId !== soilRequestId.current) return;
    setSoil(result);
    setSoilLoading(false);
  }

  /* ── Step 1: Extract label (OCR + parse) ── */
  async function runExtract(file) {
    if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current);
    imagePreviewUrl.current = URL.createObjectURL(file);
    setImagePreview(imagePreviewUrl.current);
    resultRequestId.current += 1;
    setBusy(true);
    setProgressLabel(t.preparingImage);
    setError("");
    setSlowMessage("");
    setOcr(null);
    setFields(null);
    setSummary(null);
    setCalculation(null);
    setLlm(null);
    setMixing(null);
    setTankLitres(null);
    setTankInput("");
    setSpeechError("");
    stopSpeaking();
    setProgressLabel(t.readingText);
    const result = await extractLabel(file, {
      onSlow: (msg) => setSlowMessage(msg),
    });
    setBusy(false);
    setProgressLabel("");
    setSlowMessage("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOcr(result.ocr);
    setFields(result.fields);
    setSummary(result.summary || null);
    setIsDemo(Boolean(result.isDemo));
    setScreen("confirm");
  }

  function updateConfirmedField(path, value) {
    const [fieldName, property] = path.split(".");
    setFields((current) => {
      if (!current) return current;
      if (!property) {
        return { ...current, [fieldName]: { ...current[fieldName], value, status: "edited" } };
      }
      const rate = { ...current[fieldName], [property]: value, status: "edited" };
      if (fieldName === "rate") {
        rate.value = `${rate.amount || ""} ${rate.unit || ""} per ${rate.perAmount || ""} ${rate.perUnit || ""}`.trim();
      }
      return { ...current, [fieldName]: rate };
    });
  }

  /* ── Step 2: Calculate result ── */
  async function runResult(litres, requestedLanguage = language) {
    const requestId = ++resultRequestId.current;
    setTankLitres(litres);
    setTankInput(String(litres));
    setBusy(true);
    setProgressLabel(t.preparingResult);
    setError("");
    setSlowMessage("");
    setLlm(null);
    const result = await fetchResult(
      {
        language: requestedLanguage,
        state,
        crop,
        soil,
        confirmed: true,
        tankLitres: litres,
        fields,
        ocr,
        isDemo,
      },
      { onSlow: (msg) => setSlowMessage(msg) },
    );
    if (requestId !== resultRequestId.current) return;
    setBusy(false);
    setProgressLabel("");
    setSlowMessage("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCalculation(result.calculation);
    if (result.summary) setSummary(result.summary);
    setLlm(result.llm);
    setMixing(result.mixing);
    if (result.soil) setSoil(result.soil);
    setScreen("result");
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    if (screen === "result" && !busy && tankLitres) {
      runResult(tankLitres, nextLanguage);
    }
  }

  /* ── Listen button ── */
  function handleListen() {
    if (!getSpeechSupport()) {
      setSpeechError(t.speechUnsupported);
      return;
    }
    const parts = [
      summary?.genuineness?.verdict
        ? `${t.genuinenessTitle}: ${
            summary.genuineness.verdict === "reliable"
              ? t.genuineReliable
              : summary.genuineness.verdict === "demo"
                ? t.genuineDemo
                : summary.genuineness.verdict === "uncertain"
                  ? t.genuineUncertain
                  : t.genuineUnreliable
          }`
        : "",
      calculation?.ok
        ? `${t.amountToUse}: ${calculation.quantity} ${calculation.unit}`
        : calculation?.message,
      fields?.phi?.value,
      fields?.reEntry?.value,
      fields?.precautions?.value,
      fields?.firstAid?.value,
      fields?.warnings?.value,
      llm?.ok ? llm.explanation : "",
    ].filter(Boolean);
    const spoken = speakText(parts.join(". "), language);
    setSpeechError(spoken.ok ? "" : spoken.error);
  }

  /* ── Reset ── */
  function resetAll() {
    if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current);
    imagePreviewUrl.current = "";
    setImagePreview("");
    stopSpeaking();
    setScreen("upload");
    setError("");
    setFields(null);
    setOcr(null);
    setSummary(null);
    setCalculation(null);
    setLlm(null);
    setMixing(null);
    setTankLitres(null);
    setTankInput("");
    setSpeechError("");
    setIsDemo(false);
  }

  return (
    <>
      <div className="glow-ring" />
      <main className="page">
        <header className="app-header">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 27V15m0 7C8 22 5 18 5 11c7 0 11 4 11 11Zm0-5c0-7 4-11 11-11 0 7-4 11-11 11Z" />
              </svg>
            </span>
            <div>
              <p className="app-eyebrow">{t.brandEyebrow}</p>
              <h1>{t.title}</h1>
            </div>
          </div>
          <div className="header-controls">
            <LanguageSelect language={language} onChange={handleLanguageChange} t={t} disabled={busy} />
          </div>
          <p className="app-subtitle">{t.subtitle}</p>
        </header>

        <nav className="step-nav" aria-label={t.workflowLabel}>
          <ol>
            {steps.map((label, index) => {
              const step = index + 1;
              return (
                <li
                  key={label}
                  className={`step-item${step === currentStep ? " active" : ""}${step < currentStep ? " complete" : ""}`}
                  aria-current={step === currentStep ? "step" : undefined}
                >
                  <span className="step-number">{step < currentStep ? "✓" : step}</span>
                  <span className="step-label">{label}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        {isDemo ? <p className="demo-flag">{t.demoBanner}</p> : null}

        <SafetyBanner text={t.disclaimer} />

        {slowMessage ? <p className="status">{slowMessage}</p> : null}
        {error && screen === "result" ? <p className="error" role="alert">{error}</p> : null}
        {ocr?.lowConfidence && screen === "result" ? (
          <p className="error">{t.ocrLow}</p>
        ) : null}

        {screen === "upload" ? (
          <UploadForm
            t={t}
            busy={busy}
            loadingText={progressLabel || t.extractingFields}
            error={error}
            onFile={(file, message) => {
              if (message) setError(message);
              else runExtract(file);
            }}
            state={state}
            onStateChange={handleStateChange}
            crop={crop}
            onCropChange={setCrop}
            soil={soil}
            soilLoading={soilLoading}
          />
        ) : null}

        {screen === "confirm" ? (
          <ConfirmFields
            t={t}
            fields={fields || {}}
            ocr={ocr}
            summary={summary}
            imagePreview={imagePreview}
            onChange={updateConfirmedField}
            onContinue={() => setScreen("tank")}
            onBack={() => setScreen("upload")}
          />
        ) : null}

        {screen === "tank" ? (
          <TankScreen
            t={t}
            busy={busy}
            error={error}
            onCalculate={runResult}
            onBack={() => setScreen("confirm")}
            tankLitres={tankInput}
            onTankChange={setTankInput}
          />
        ) : null}

        {screen === "result" ? (
          <ResultCard
            t={t}
            fields={fields}
            summary={summary}
            tankLitres={tankLitres}
            calculation={calculation}
            llm={llm}
            mixing={mixing}
            soil={soil}
            state={state}
            crop={crop}
            busy={busy}
            speechError={speechError}
            onListen={handleListen}
            onStop={stopSpeaking}
            onBack={() => setScreen("tank")}
            onRetry={resetAll}
          />
        ) : null}
        <footer className="app-footer">{t.footerText}</footer>
      </main>
    </>
  );
}
