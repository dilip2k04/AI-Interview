import { useState, useEffect } from "react";
import { api } from "../services/api.js";

function ScoreCircleAnimated({ pct, color }) {
  const [displayed, setDisplayed] = useState(0);
  const r = 54; const circ = 2 * Math.PI * r; const dash = (displayed / 100) * circ;
  useEffect(() => {
    const t = setTimeout(() => {
      let s = 0;
      const step = () => { s += 2; setDisplayed(Math.min(s, pct)); if (s < pct) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, 300);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{displayed}%</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)", marginTop: 4 }}>Score</span>
      </div>
    </div>
  );
}

export default function InterviewComplete({ navigate, interviewId, completedInterview }) {
  const [interview, setInterview] = useState(completedInterview || null);
  const [loading, setLoading] = useState(!completedInterview);
  const [error, setError] = useState("");

  useEffect(() => {
    if (completedInterview) return;
    if (!interviewId) { setError("No interview data"); setLoading(false); return; }
    api.getInterview(interviewId).then((d) => setInterview(d.interview)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [interviewId, completedInterview]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-0)" }}>
      <div style={{ textAlign: "center" }}><div className="spinner spinner-lg" style={{ margin: "0 auto 16px" }} /><div style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--text-2)" }}>Loading results...</div></div>
    </div>
  );

  const pct = interview?.score?.percentage || 0;
  const mode = interview?.mode || "mcq";
  const tier = pct >= 80 ? "high" : pct >= 60 ? "mid" : "low";
  const TIERS = { high: { label: "Excellent Performance!", color: "var(--green)", icon: "🏆", alert: "alert-success" }, mid: { label: "Good Performance!", color: "var(--cyan)", icon: "✅", alert: "alert-info" }, low: { label: "Keep Improving!", color: "var(--amber)", icon: "📈", alert: "alert-warn" } };
  const t = TIERS[tier];
  const verdict = interview?.aiReport?.hiringRecommendation || "Consider";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-0)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 660, padding: "48px 24px 60px" }}>

        {error && <div className="alert alert-error mb-6"><span>⚠</span>{error}</div>}

        {/* Score card */}
        <div className="card card-pad-lg animate-scaleIn" style={{ textAlign: "center", marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${t.color},transparent)` }} />
          <div style={{ fontSize: 48, marginBottom: 8 }}>{t.icon}</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>Interview Complete</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-0)", marginBottom: 4 }}>{t.label}</h1>
          <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 28 }}>{mode === "mcq" ? "MCQ Interview" : "Virtual Interview"}</p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <ScoreCircleAnimated pct={pct} color={t.color} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Score", value: `${pct}%`, color: t.color },
              { label: "Mode", value: mode.toUpperCase(), color: "var(--purple)" },
              { label: "Verdict", value: verdict, color: verdict === "Hire" || verdict === "Strong Hire" ? "var(--green)" : verdict === "Consider" ? "var(--amber)" : "var(--red)" },
            ].map((item) => (
              <div key={item.label} style={{ padding: 14, background: "var(--bg-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div className={`alert ${t.alert}`} style={{ textAlign: "left" }}>
            <span>{t.icon}</span>
            <span>{interview?.aiReport?.overallSummary || interview?.aiReport?.executiveSummary || "Your results have been submitted to the HR team."}</span>
          </div>
        </div>

        {/* Topic breakdown */}
        {interview?.topicBreakdown?.length > 0 && (
          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 20 }}>Performance Breakdown</div>
            {interview.topicBreakdown.map((tp) => {
              const c = tp.percentage >= 80 ? "green" : tp.percentage >= 60 ? "" : "red";
              const cv = tp.percentage >= 80 ? "var(--green)" : tp.percentage >= 60 ? "var(--cyan)" : "var(--red)";
              return (
                <div key={tp.topic} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--text-1)" }}>{tp.topic}</span>
                    <span style={{ fontFamily: "var(--font-m)", fontSize: 12, color: cv, fontWeight: 700 }}>{tp.percentage}%</span>
                  </div>
                  <div className="progress-bar-wrap"><div className={`progress-bar-fill ${c}`} style={{ width: `${tp.percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Next steps */}
        <div className="card card-pad" style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>What happens next?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "📊", text: "Your responses are being reviewed by the AI evaluation engine" },
              { icon: "👁️", text: "The proctoring report is being reviewed by HR" },
              { icon: "📧", text: "You'll receive email feedback within 2-3 business days" },
              { icon: "🤝", text: "If selected, HR will reach out to schedule next steps" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-lg full-w" onClick={() => navigate("candidate-dashboard")}>Back to Dashboard</button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", marginTop: 16, fontFamily: "var(--font-m)" }}>
          Interview ID: {interview?._id?.slice(-8).toUpperCase()} · Powered by Gemini AI
        </p>
      </div>
    </div>
  );
}
