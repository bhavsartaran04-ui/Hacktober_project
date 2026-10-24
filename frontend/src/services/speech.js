export function getSpeechSupport() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakText(text, language) {
  if (!getSpeechSupport()) {
    return {
      ok: false,
      error: "This browser cannot read aloud (no Web Speech API).",
    };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

export function stopSpeaking() {
  if (getSpeechSupport()) {
    window.speechSynthesis.cancel();
  }
}
