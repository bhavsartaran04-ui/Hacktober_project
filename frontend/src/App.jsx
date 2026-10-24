import { useMemo, useState } from "react";
import LanguageSelect from "./components/LanguageSelect.jsx";
import SafetyBanner from "./components/SafetyBanner.jsx";
import UploadForm from "./components/UploadForm.jsx";
import TankScreen from "./components/TankScreen.jsx";
import ResultCard from "./components/ResultCard.jsx";
import { extractLabel, fetchResult } from "./services/api.js";
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

  const t = useMemo(() => copy[language] || copy.en, [language]);

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

  async function handleDemo(kind) {
    const path =
      kind === "missing" ? "/demo/demo-missing-rate.png" : "/demo/demo-full.png";
    try {
      const res = await fetch(path);
      if (!res.ok) {
        setError("Could not load demo image.");
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], path.split("/").pop(), { type: "image/png" });
      await runExtract(file, true);
    } catch {
      setError("Could not load demo image.");
    }
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
            onDemo={handleDemo}
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
