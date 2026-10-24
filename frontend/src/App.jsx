import { useMemo, useRef, useState } from "react";
import LanguageSelect from "./components/LanguageSelect.jsx";
import SafetyBanner from "./components/SafetyBanner.jsx";
import UploadForm from "./components/UploadForm.jsx";
import TankScreen from "./components/TankScreen.jsx";
import ResultCard from "./components/ResultCard.jsx";
import { extractLabel, fetchResult, fetchSoil } from "./services/api.js";
import { getSpeechSupport, speakText, stopSpeaking } from "./services/speech.js";
import { copy } from "./utils/copy.js";

export default function App() {
  const [language, setLanguage] = useState("en");
  const [screen, setScreen] = useState("upload"); // upload → tank → result
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [slowMessage, setSlowMessage] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [ocr, setOcr] = useState(null);
  const [fields, setFields] = useState(null);
  const [tankLitres, setTankLitres] = useState(null);
  const [calculation, setCalculation] = useState(null);
  const [llm, setLlm] = useState(null);
  const [mixing, setMixing] = useState(null);
  const [speechError, setSpeechError] = useState("");
  const [state, setState] = useState("");
  const [soil, setSoil] = useState(null);
  const [crop, setCrop] = useState("");
  const [soilLoading, setSoilLoading] = useState(false);
  const soilRequestId = useRef(0);

  const t = useMemo(() => copy[language] || copy.en, [language]);

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
    // Skip confirm → go straight to tank size
    setScreen("tank");
  }

  /* ── Step 2: Calculate result ── */
  async function runResult(litres) {
    setTankLitres(litres);
    setBusy(true);
    setError("");
    setSlowMessage("");
    const result = await fetchResult(
      {
        language,
        state,
        crop,
        soil,
        confirmed: true,
        tankLitres: litres,
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
    if (result.soil) setSoil(result.soil);
    setScreen("result");
  }

  /* ── Listen button ── */
  function handleListen() {
    if (!getSpeechSupport()) {
      setSpeechError(
        language === "hi"
          ? "यह ब्राउज़र बोल नहीं सकता।"
          : "This browser cannot read aloud.",
      );
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

  /* ── Reset ── */
  function resetAll() {
    stopSpeaking();
    setScreen("upload");
    setError("");
    setFields(null);
    setOcr(null);
    setCalculation(null);
    setLlm(null);
    setMixing(null);
    setTankLitres(null);
    setSpeechError("");
    setIsDemo(false);
  }

  return (
    <>
      <div className="glow-ring" />
      <main className="page">
        <header className="app-header">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </header>

        <LanguageSelect language={language} onChange={setLanguage} t={t} />

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
            state={state}
            onStateChange={handleStateChange}
            crop={crop}
            onCropChange={setCrop}
            soil={soil}
            soilLoading={soilLoading}
          />
        ) : null}

        {screen === "tank" ? (
          <TankScreen
            t={t}
            busy={busy}
            error={error}
            onCalculate={runResult}
            onBack={resetAll}
          />
        ) : null}

        {screen === "result" ? (
          <ResultCard
            t={t}
            fields={fields}
            tankLitres={tankLitres}
            calculation={calculation}
            llm={llm}
            mixing={mixing}
            soil={soil}
            state={state}
            crop={crop}
            speechError={speechError}
            onListen={handleListen}
            onStop={stopSpeaking}
            onBack={() => setScreen("tank")}
            onRetry={resetAll}
          />
        ) : null}
      </main>
    </>
  );
}
