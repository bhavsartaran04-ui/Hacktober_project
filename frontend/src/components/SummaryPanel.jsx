function verdictCopy(t, verdict) {
  if (verdict === "reliable") return { label: t.genuineReliable, tagClass: "tag-calc" };
  if (verdict === "demo") return { label: t.genuineDemo, tagClass: "tag-ai" };
  if (verdict === "uncertain") return { label: t.genuineUncertain, tagClass: "tag-warn" };
  return { label: t.genuineUnreliable, tagClass: "tag-bad" };
}

function amountText(t, amountToUse, tankLitres) {
  if (!amountToUse || amountToUse.status === "not_found") return t.amountMissing;
  if (amountToUse.status === "ready") {
    return `${amountToUse.tankQuantity} ${amountToUse.tankUnit}`;
  }
  if (amountToUse.status === "not_volume") return t.amountNotVolume;
  if (amountToUse.status === "needs_tank") return amountToUse.labelRate || t.amountNeedsTank;
  if (amountToUse.labelRate) return amountToUse.labelRate;
  return tankLitres ? t.amountNotVolume : t.amountNeedsTank;
}

export default function SummaryPanel({ t, summary, tankLitres, compact }) {
  const genuineness = summary?.genuineness;
  const amountToUse = summary?.amountToUse;
  const verdict = verdictCopy(t, genuineness?.verdict);
  const quantity = amountText(t, amountToUse, tankLitres);
  const showBig = amountToUse?.status === "ready";

  return (
    <div className={`summary-panel${compact ? " summary-compact" : ""}`}>
      <div className="result-item">
        <div className="result-head">
          <strong>{t.genuinenessTitle}</strong>
          <em className={`tag ${verdict.tagClass}`}>{verdict.label}</em>
        </div>
        <p className="result-value">
          {genuineness?.confidence != null ? `${genuineness.confidence}%` : "—"}
          {genuineness?.score != null ? ` · ${genuineness.score}/100` : ""}
        </p>
        {genuineness?.evidence?.length ? (
          <p className="hint">{genuineness.evidence.slice(0, 4).join(" · ")}</p>
        ) : null}
        <p className="hint">{t.genuineHint}</p>
      </div>
      <div className="result-item">
        <div className="result-head">
          <strong>{t.amountToUse}</strong>
          <em className={`tag ${showBig ? "tag-calc" : ""}`}>{t.labelRate}</em>
        </div>
        <p className={showBig ? "result-big" : "result-value"}>{quantity}</p>
        {amountToUse?.labelRate ? <p className="hint">{t.labelRate}: {amountToUse.labelRate}</p> : null}
        {amountToUse?.status === "needs_tank" ? <p className="hint">{t.amountNeedsTank}</p> : null}
        {showBig && tankLitres ? <p className="hint">{t.tankLabel}: {tankLitres} {t.tankCustom}</p> : null}
      </div>
    </div>
  );
}
