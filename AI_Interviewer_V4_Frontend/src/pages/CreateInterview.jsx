import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../services/api.js";

export default function CreateInterview({ navigate }) {
  const [step, setStep] = useState(1);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [jd, setJd] = useState("");
  const [techStack, setTechStack] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [config, setConfig] = useState({ mode: "mcq", difficulty: "medium", numQuestions: 10, durationMinutes: 45 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.getCandidates().then((d) => setCandidates(d.candidates)).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!jd.trim() || jd.trim().length < 30) { setError("JD must be at least 30 characters"); return; }
    setError(""); setAnalyzing(true);
    try {
      const d = await api.analyzeJD(jd, jobRole);
      setAnalysis(d.analysis);
      if (!jobRole && d.analysis.extractedJobRole) setJobRole(d.analysis.extractedJobRole);
      setStep(2);
    } catch (e) { setError(e.message); }
    setAnalyzing(false);
  };

  const applyRecommended = () => {
    if (!analysis?.suggestedInterviewConfig) return;
    const s = analysis.suggestedInterviewConfig;
    setConfig({ mode: s.recommendedMode, difficulty: s.recommendedDifficulty, numQuestions: s.suggestedQuestionCount, durationMinutes: s.suggestedDurationMinutes });
  };

  const handleCreate = async () => {
    if (!selectedCandidate) { setError("Please select a candidate"); return; }
    setError(""); setCreating(true);
    try {
      const techArr = techStack.split(",").map((t) => t.trim()).filter(Boolean);
      await api.createInterview({ candidateId: selectedCandidate, jobRole, jobDescription: jd, techStack: techArr, ...config, jdAnalysis: analysis });
      setSuccess("Interview created and assigned successfully!");
      setStep(3);
    } catch (e) { setError(e.message); }
    setCreating(false);
  };

  const SAMPLE_JD = `We are looking for a skilled React Frontend Engineer.

Responsibilities:
- Build and maintain scalable React applications
- Collaborate with backend teams to integrate REST APIs
- Write clean, well-tested TypeScript code

Requirements:
- 3+ years of React experience
- Proficiency in TypeScript, Redux, and React hooks
- Experience with REST APIs and async patterns
- Knowledge of testing (Jest, React Testing Library)`;

  return (
    <div className="page-wrapper animate-fadeIn">
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
      <Navbar navigate={navigate} />
      <div className="container-sm" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ marginBottom: 32 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("hr-dashboard")} style={{ marginBottom: 16 }}>← Back</button>
          <h1 className="page-title">Create Interview</h1>
          <p className="page-sub">AI-powered interview generation</p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", gap: 0, marginBottom: 36 }}>
          {["Job Description", "Configure", "Done"].map((label, i) => {
            const s = i + 1; const done = step > s; const active = step === s;
            return (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i > 0 && <div style={{ position: "absolute", left: "-50%", top: 14, width: "100%", height: 2, background: done || active ? "var(--cyan)" : "var(--border)", transition: "background .3s" }} />}
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: done ? "var(--cyan)" : active ? "var(--cyan-soft)" : "var(--bg-2)", border: `2px solid ${done || active ? "var(--cyan)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "var(--font-m)", fontWeight: 700, color: done ? "var(--bg-0)" : active ? "var(--cyan)" : "var(--text-3)", zIndex: 1, position: "relative" }}>{done ? "✓" : s}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-m)", marginTop: 6, color: active ? "var(--cyan)" : "var(--text-2)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {error && <div className="alert alert-error mb-4"><span>⚠</span>{error}</div>}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="card card-pad animate-scaleIn">
            <div className="section-title" style={{ marginBottom: 4 }}>Job Description</div>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24, fontFamily: "var(--font-m)" }}>Gemini AI will analyze this to generate relevant questions</p>
            <div className="form-group">
              <label className="form-label">Job Title / Role</label>
              <input className="form-input" placeholder="e.g. Senior React Developer" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tech Stack (comma separated)</label>
              <input className="form-input" placeholder="React, TypeScript, Node.js" value={techStack} onChange={(e) => setTechStack(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Job Description *</label>
              <textarea className="form-textarea" style={{ minHeight: 200 }} placeholder="Paste full job description here..." value={jd} onChange={(e) => setJd(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setJd(SAMPLE_JD)}>Load Sample</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setJd(""); setJobRole(""); setTechStack(""); }}>Clear</button>
            </div>
            <button className="btn btn-primary btn-lg full-w" onClick={handleAnalyze} disabled={!jd.trim() || analyzing}>
              {analyzing ? <><div className="spinner" />Analyzing with Gemini AI...</> : "Analyze Job Description →"}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && analysis && (
          <div className="animate-scaleIn">
            <div className="card card-pad mb-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--cyan)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>AI Analysis Complete</div>
                  <div className="section-title">{analysis.extractedJobRole || jobRole}</div>
                  <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>{analysis.summary}</p>
                </div>
                <span className="badge badge-green badge-dot">Analyzed</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {(analysis.primaryTechStack || []).map((t) => <span key={t} className="badge badge-cyan">{t}</span>)}
                {(analysis.secondarySkills || []).map((t) => <span key={t} className="badge badge-ghost">{t}</span>)}
              </div>
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <span>💡</span>
                <div>
                  <strong>Recommended:</strong> {analysis.suggestedInterviewConfig?.recommendedMode} · {analysis.suggestedInterviewConfig?.recommendedDifficulty} · {analysis.suggestedInterviewConfig?.suggestedQuestionCount} questions
                  <button className="btn btn-success btn-sm" style={{ marginLeft: 12 }} onClick={applyRecommended}>Apply</button>
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="section-title" style={{ marginBottom: 20 }}>Interview Configuration</div>

              <div className="form-group">
                <label className="form-label">Assign to Candidate *</label>
                <select className="form-select" value={selectedCandidate} onChange={(e) => setSelectedCandidate(e.target.value)}>
                  <option value="">Select candidate...</option>
                  {candidates.map((c) => <option key={c._id} value={c._id}>{c.name} — {c.email}</option>)}
                </select>
                {candidates.length === 0 && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6, fontFamily: "var(--font-m)" }}>No candidates registered yet.</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Interview Mode</label>
                <div className="option-grid option-grid-2">
                  <div className={`option-card ${config.mode === "mcq" ? "selected" : ""}`} onClick={() => setConfig({ ...config, mode: "mcq" })}>
                    <div className="option-card-icon">📝</div><div className="option-card-label">MCQ</div><div className="option-card-sub">Auto-evaluated choices</div>
                  </div>
                  <div className={`option-card ${config.mode === "virtual" ? "selected" : ""}`} onClick={() => setConfig({ ...config, mode: "virtual" })}>
                    <div className="option-card-icon">🎙️</div><div className="option-card-label">Virtual</div><div className="option-card-sub">Adaptive AI conversation</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <div className="option-grid option-grid-3">
                  {["easy", "medium", "hard"].map((d) => (
                    <div key={d} className={`option-card ${config.difficulty === d ? "selected" : ""}`} onClick={() => setConfig({ ...config, difficulty: d })}>
                      <div className="option-card-icon">{d === "easy" ? "🟢" : d === "medium" ? "🟡" : "🔴"}</div>
                      <div className="option-card-label" style={{ textTransform: "capitalize" }}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Questions</label>
                  <select className="form-select" value={config.numQuestions} onChange={(e) => setConfig({ ...config, numQuestions: Number(e.target.value) })}>
                    {[5, 8, 10, 12, 15].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (min)</label>
                  <select className="form-select" value={config.durationMinutes} onChange={(e) => setConfig({ ...config, durationMinutes: Number(e.target.value) })}>
                    {[15, 20, 30, 45, 60, 90].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <button className="btn btn-primary btn-lg full-w mt-4" onClick={handleCreate} disabled={creating || !selectedCandidate}>
                {creating ? <><div className="spinner" />Generating Questions & Assigning...</> : "Generate Questions & Assign →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="card card-pad animate-scaleIn" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Interview Assigned!</h2>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 28 }}>{success}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate("hr-dashboard")}>Back to Dashboard</button>
              <button className="btn btn-ghost btn-lg" onClick={() => { setStep(1); setAnalysis(null); setJd(""); setJobRole(""); setTechStack(""); setSelectedCandidate(""); setSuccess(""); }}>Create Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
