import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../services/api.js";

function ScoreCircle({ pct, color = "var(--cyan)" }) {
  const r = 46; const circ = 2 * Math.PI * r; const dash = (pct / 100) * circ;
  return (
    <div className="score-circle">
      <svg width="120" height="120" viewBox="0 0 120 120"><circle className="score-circle-bg" cx="60" cy="60" r={r} /><circle className="score-circle-fill" cx="60" cy="60" r={r} stroke={color} strokeDasharray={`${dash} ${circ}`} /></svg>
      <div className="score-circle-text"><span style={{ color }}>{pct}%</span><span className="score-circle-sub">Score</span></div>
    </div>
  );
}

const VERDICT_BADGE = { "Hire": "badge-cyan", "Strong Hire": "badge-green", "Consider": "badge-amber", "Reject": "badge-red" };

export default function HRReport({ navigate, interviewId }) {
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!interviewId) { setError("No interview ID"); setLoading(false); return; }
    api.getInterview(interviewId).then((d) => setInterview(d.interview)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [interviewId]);

  const generateEmail = async () => {
    setEmailLoading(true);
    try { const d = await api.generateFeedbackEmail(interviewId); setEmail(d.email); }
    catch (e) { setError(e.message); }
    setEmailLoading(false);
  };

  if (loading) return <div className="page-wrapper"><div className="bg-grid" /><Navbar navigate={navigate} /><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}><div className="spinner spinner-lg" /></div></div>;
  if (error || !interview) return <div className="page-wrapper"><div className="bg-grid" /><Navbar navigate={navigate} /><div className="container" style={{ paddingTop: 40 }}><div className="alert alert-error"><span>⚠</span>{error || "Interview not found"}</div><button className="btn btn-ghost" onClick={() => navigate("hr-dashboard")}>← Back</button></div></div>;

  const r = interview;
  const pct = r.score?.percentage || 0;
  const isTerminated = r.status === "terminated";
  const scoreColor = isTerminated ? "var(--red)" : pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--cyan)" : "var(--red)";
  const verdict = r.aiReport?.hiringRecommendation || "Consider";
  const TERM_LABELS = { look_away: "Look-Away Violation", tab_switch: "Tab-Switch Violation" };

  return (
    <div className="page-wrapper animate-fadeIn">
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
      <Navbar navigate={navigate} />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("hr-dashboard")} style={{ marginBottom: 24 }}>← Back</button>

        {/* Termination banner */}
        {isTerminated && (
          <div style={{
            marginBottom: 20, padding: "16px 20px",
            background: "rgba(255,77,106,0.08)",
            border: "1px solid rgba(255,77,106,0.35)",
            borderRadius: "var(--radius-md)",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>
              {r.terminationReason === "look_away" ? "👁️" : "🚫"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 3 }}>
                ⛔ Interview Terminated — {TERM_LABELS[r.terminationReason] || "Proctoring Violation"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-1)" }}>
                {r.aiReport?.terminationNote || "Session was auto-terminated due to a proctoring violation. Only partial answers were scored."}
              </div>
              {r.score?.isPartial && (
                <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 4, fontFamily: "var(--font-m)" }}>
                  Score reflects {r.answers?.length || 0} answered out of {r.numQuestions} total questions.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="card card-pad mb-6" style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap",
          border: isTerminated ? "1px solid rgba(255,77,106,0.25)" : undefined }}>
          <ScoreCircle pct={pct} color={scoreColor} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: isTerminated ? "var(--red)" : "var(--text-2)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>
              {isTerminated ? "⛔ Terminated Session" : "Interview Report"}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{r.candidate?.name}</h1>
            <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 14 }}>{r.jobRole} · {r.difficulty} · {r.mode?.toUpperCase()}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className={`badge ${VERDICT_BADGE[verdict] || "badge-ghost"}`}>{verdict}</span>
              {isTerminated && <span className="badge badge-red">⛔ Violated</span>}
              {r.score?.isPartial && <span className="badge badge-amber">Partial Score</span>}
              {r.mode === "mcq" && r.score && <span className="badge badge-ghost">{r.answers?.length || 0}/{r.numQuestions} Answered</span>}
              {r.proctorReport?.integrityScore != null && (
                <span className={`badge ${r.proctorReport.riskLevel === "Low" ? "badge-green" : "badge-red"}`}>
                  Integrity {r.proctorReport.integrityScore}%
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 220 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)", marginBottom: 4 }}>Hiring Rationale</div>
            <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.5 }}>{r.aiReport?.hiringRationale}</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Topic Breakdown */}
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 20 }}>Topic Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(r.topicBreakdown || []).map((t) => {
                const c = t.percentage >= 80 ? "green" : t.percentage >= 60 ? "" : "red";
                const cv = t.percentage >= 80 ? "var(--green)" : t.percentage >= 60 ? "var(--cyan)" : "var(--red)";
                return (
                  <div key={t.topic}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--text-1)" }}>{t.topic}</span>
                      <span style={{ fontFamily: "var(--font-m)", fontSize: 12, color: cv, fontWeight: 700 }}>{t.percentage}%</span>
                    </div>
                    <div className="progress-bar-wrap"><div className={`progress-bar-fill ${c}`} style={{ width: `${t.percentage}%` }} /></div>
                  </div>
                );
              })}
              {!(r.topicBreakdown?.length) && <div style={{ color: "var(--text-2)", fontSize: 13 }}>No topic data available</div>}
            </div>
          </div>

          {/* AI Insights */}
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 16 }}>AI Evaluation</div>
            <p style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.7, marginBottom: 16 }}>
              {r.aiReport?.overallSummary || r.aiReport?.executiveSummary || "No summary available."}
            </p>
            {(r.aiReport?.strengths?.length > 0) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--green)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Strengths</div>
                {r.aiReport.strengths.map((s, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 13, color: "var(--text-1)" }}><span style={{ color: "var(--green)" }}>✓</span>{s}</div>)}
              </div>
            )}
            {(r.aiReport?.weaknesses?.length > 0 || r.aiReport?.areasForImprovement?.length > 0) && (
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--amber)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Gaps</div>
                {(r.aiReport.weaknesses || r.aiReport.areasForImprovement || []).map((s, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 13, color: "var(--text-1)" }}><span style={{ color: "var(--amber)" }}>△</span>{s}</div>)}
              </div>
            )}
          </div>
        </div>

        {/* Answers Review */}
        {r.answers?.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: "20px 24px" }}>
              <div className="section-title">{r.mode === "mcq" ? "Question Review" : "Response Evaluation"}</div>
              <div className="section-sub">{r.answers.length} answers recorded</div>
            </div>
            <div className="divider" style={{ margin: 0 }} />
            {r.answers.map((a, i) => (
              <div key={i} style={{ padding: "18px 24px", borderBottom: i < r.answers.length - 1 ? "1px solid var(--border)" : "none", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: (r.mode === "mcq" ? a.isCorrect : (a.score || 0) >= 60) ? "var(--green-dim)" : "var(--red-dim)", border: `1px solid ${(r.mode === "mcq" ? a.isCorrect : (a.score || 0) >= 60) ? "rgba(0,255,178,.3)" : "rgba(255,77,106,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                  {r.mode === "mcq" ? (a.isCorrect ? "✓" : "✗") : (a.score || 0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "var(--text-0)", marginBottom: 6, fontWeight: 500 }}>{a.questionText}</div>
                  {r.mode === "mcq" ? (
                    <div style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: "var(--font-m)" }}>
                      <span style={{ color: "var(--text-2)" }}>Topic: <span style={{ color: "var(--text-1)" }}>{a.topic}</span></span>
                      <span style={{ color: a.isCorrect ? "var(--green)" : "var(--red)" }}>Selected: {a.selectedOption || "—"}</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6, fontFamily: "var(--font-m)" }}>Verdict: <span style={{ color: a.verdict === "Excellent" ? "var(--green)" : a.verdict === "Good" ? "var(--cyan)" : "var(--amber)" }}>{a.verdict}</span> · Score: {a.score}/100</div>
                      {a.responseText && <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.5, padding: "8px 12px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid var(--border)" }}>{a.responseText.slice(0, 200)}{a.responseText.length > 200 ? "..." : ""}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Proctor + Email */}
        <div className="grid-2">
          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 16 }}>Proctoring</div>
            {r.proctorReport ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: r.proctorReport.riskLevel === "Low" ? "var(--green-dim)" : "var(--amber-dim)", border: `2px solid ${r.proctorReport.riskLevel === "Low" ? "rgba(0,255,178,.3)" : "rgba(255,184,48,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛡</div>
                  <div><div style={{ fontSize: 22, fontWeight: 800, color: r.proctorReport.riskLevel === "Low" ? "var(--green)" : "var(--amber)" }}>{r.proctorReport.integrityScore}%</div><div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text-2)" }}>Integrity Score</div></div>
                  <span className={`badge badge-dot ${r.proctorReport.riskLevel === "Low" ? "badge-green" : "badge-amber"}`}>{r.proctorReport.riskLevel} Risk</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.6 }}>{r.proctorReport.behaviorSummary}</p>
              </>
            ) : <div style={{ color: "var(--text-2)", fontSize: 13 }}>No proctoring data available.</div>}
          </div>

          <div className="card card-pad">
            <div className="section-title" style={{ marginBottom: 16 }}>Feedback Email</div>
            {!email ? (
              <>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 16 }}>Generate a professional feedback email for the candidate based on their performance.</p>
                <button className="btn btn-primary full-w" onClick={generateEmail} disabled={emailLoading}>
                  {emailLoading ? <><div className="spinner" />Generating...</> : "📧 Generate Feedback Email"}
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)", marginBottom: 4 }}>SUBJECT</div>
                  <div style={{ fontSize: 13, color: "var(--text-0)", fontWeight: 600 }}>{email.subject}</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.6, maxHeight: 180, overflowY: "auto", padding: "12px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>{email.body}</div>
                <button className="btn btn-ghost btn-sm mt-4" onClick={() => { navigator.clipboard?.writeText(`Subject: ${email.subject}\n\n${email.body}`); }}>Copy to Clipboard</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
