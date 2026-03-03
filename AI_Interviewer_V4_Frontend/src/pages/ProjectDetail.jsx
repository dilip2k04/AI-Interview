import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../services/api.js";

const STATUS_BADGE = { completed: "badge-green", pending: "badge-ghost", in_progress: "badge-amber", expired: "badge-red", terminated: "badge-red" };
const DIFF_BADGE   = { easy: "badge-green", medium: "badge-amber", hard: "badge-red" };
const TERM_ICON    = { look_away: "👁️", tab_switch: "🚫" };

// ── Bulk Assign Wizard ────────────────────────────────────────────────────────
function BulkAssignModal({ project, onClose, onDone }) {
  const [step,           setStep]       = useState(1); // 1=JD, 2=Config+Candidates, 3=Done
  const [candidates,     setCandidates] = useState([]);
  const [selected,       setSelected]  = useState(new Set());
  const [jobRole,        setJobRole]   = useState(project.jobRole || "");
  const [jd,             setJd]        = useState("");
  const [techStack,      setTechStack] = useState((project.techStack || []).join(", "));
  const [analysis,       setAnalysis]  = useState(null);
  const [analyzing,      setAnalyzing] = useState(false);
  const [config,         setConfig]    = useState({ mode: "mcq", difficulty: "medium", numQuestions: 10, durationMinutes: 45 });
  const [creating,       setCreating]  = useState(false);
  const [result,         setResult]    = useState(null);
  const [err,            setErr]       = useState("");

  useEffect(() => {
    api.getCandidates().then((d) => setCandidates(d.candidates)).catch(() => {});
  }, []);

  const toggleCandidate = (id) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const toggleAll = () => {
    if (selected.size === candidates.length) setSelected(new Set());
    else setSelected(new Set(candidates.map((c) => c._id)));
  };

  const handleAnalyze = async () => {
    if (!jd.trim() || jd.length < 30) { setErr("JD must be at least 30 characters"); return; }
    setErr(""); setAnalyzing(true);
    try {
      const d = await api.analyzeJD(jd, jobRole);
      setAnalysis(d.analysis);
      if (!jobRole && d.analysis.extractedJobRole) setJobRole(d.analysis.extractedJobRole);
      setStep(2);
    } catch (e) { setErr(e.message); }
    setAnalyzing(false);
  };

  const applyRecommended = () => {
    if (!analysis?.suggestedInterviewConfig) return;
    const s = analysis.suggestedInterviewConfig;
    setConfig({ mode: s.recommendedMode, difficulty: s.recommendedDifficulty, numQuestions: s.suggestedQuestionCount, durationMinutes: s.suggestedDurationMinutes });
  };

  const handleAssign = async () => {
    if (selected.size === 0) { setErr("Select at least one candidate"); return; }
    setErr(""); setCreating(true);
    try {
      const techArr = techStack.split(",").map((t) => t.trim()).filter(Boolean);
      const d = await api.bulkAssign(project._id, {
        candidateIds: [...selected],
        jobRole, jobDescription: jd,
        techStack: techArr, ...config,
        jdAnalysis: analysis,
      });
      setResult(d);
      setStep(3);
      onDone?.();
    } catch (e) { setErr(e.message); }
    setCreating(false);
  };

  const SAMPLE_JD = `We are seeking a skilled ${jobRole || "Software Engineer"} to join our team.\n\nResponsibilities:\n- Design and develop scalable applications\n- Collaborate with cross-functional teams\n- Write clean, well-tested code\n\nRequirements:\n- 3+ years of relevant experience\n- Strong problem-solving skills\n- Experience with modern frameworks and tools`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,8,16,0.9)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 24px", overflowY: "auto" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: "100%", maxWidth: 700, padding: 32, animation: "scaleIn .3s ease" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Assign Interviews</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>Project: <span style={{ color: "var(--cyan)" }}>{project.name}</span></p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {/* Step pills */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
          {["Job Description", "Configure & Assign", "Done"].map((label, i) => {
            const s = i + 1; const done = step > s; const active = step === s;
            return (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i > 0 && <div style={{ position: "absolute", left: "-50%", top: 13, width: "100%", height: 2, background: done || active ? "var(--cyan)" : "var(--border)", transition: "background .3s" }} />}
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "var(--cyan)" : active ? "var(--cyan-soft)" : "var(--bg-2)", border: `2px solid ${done || active ? "var(--cyan)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-m)", fontWeight: 700, color: done ? "var(--bg-0)" : active ? "var(--cyan)" : "var(--text-3)", zIndex: 1, position: "relative" }}>{done ? "✓" : s}</div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-m)", marginTop: 5, color: active ? "var(--cyan)" : "var(--text-2)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: "center" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {err && <div className="alert alert-error mb-4"><span>⚠</span>{err}</div>}

        {/* STEP 1: JD */}
        {step === 1 && (
          <div>
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
              <textarea className="form-textarea" style={{ minHeight: 180 }} placeholder="Paste full JD here…" value={jd} onChange={(e) => setJd(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setJd(SAMPLE_JD)}>Load Sample</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setJd("")}>Clear</button>
            </div>
            <button className="btn btn-primary btn-lg full-w" onClick={handleAnalyze} disabled={!jd.trim() || analyzing}>
              {analyzing ? <><div className="spinner" />Analyzing with Gemini…</> : "Analyze & Continue →"}
            </button>
          </div>
        )}

        {/* STEP 2: Config + Candidates */}
        {step === 2 && (
          <div>
            {/* AI analysis card */}
            {analysis && (
              <div style={{ marginBottom: 20, padding: "16px 18px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--cyan)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 3 }}>AI Analysis</div>
                    <div style={{ fontWeight: 700, color: "var(--text-0)" }}>{analysis.extractedJobRole || jobRole}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(analysis.primaryTechStack || []).slice(0, 4).map((t) => <span key={t} className="badge badge-cyan" style={{ fontSize: 10 }}>{t}</span>)}
                  </div>
                </div>
                <div className="alert alert-info" style={{ padding: "8px 12px", fontSize: 12, marginBottom: 0 }}>
                  <span>💡</span>
                  <div>
                    Recommended: {analysis.suggestedInterviewConfig?.recommendedMode} · {analysis.suggestedInterviewConfig?.recommendedDifficulty} · {analysis.suggestedInterviewConfig?.suggestedQuestionCount}Q
                    <button className="btn btn-success btn-sm" style={{ marginLeft: 10, padding: "3px 10px", fontSize: 11 }} onClick={applyRecommended}>Apply</button>
                  </div>
                </div>
              </div>
            )}

            {/* Interview config */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mode</label>
                <select className="form-select" value={config.mode} onChange={(e) => setConfig({ ...config, mode: e.target.value })}>
                  <option value="mcq">MCQ – Auto evaluated</option>
                  <option value="virtual">Virtual – AI conversation</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Difficulty</label>
                <select className="form-select" value={config.difficulty} onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Questions</label>
                <select className="form-select" value={config.numQuestions} onChange={(e) => setConfig({ ...config, numQuestions: Number(e.target.value) })}>
                  {[5, 8, 10, 12, 15].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Duration (min)</label>
                <select className="form-select" value={config.durationMinutes} onChange={(e) => setConfig({ ...config, durationMinutes: Number(e.target.value) })}>
                  {[15, 20, 30, 45, 60, 90].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Candidate multi-select */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Select Candidates * ({selected.size} selected)</label>
                <button className="btn btn-ghost btn-sm" onClick={toggleAll} style={{ fontSize: 11 }}>
                  {selected.size === candidates.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {candidates.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-2)", fontSize: 13, border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  No registered candidates yet
                </div>
              ) : (
                <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-2)" }}>
                  {candidates.map((c, i) => {
                    const isSelected = selected.has(c._id);
                    return (
                      <div key={c._id}
                        onClick={() => toggleCandidate(c._id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                          cursor: "pointer", borderBottom: i < candidates.length - 1 ? "1px solid var(--border)" : "none",
                          background: isSelected ? "var(--cyan-soft)" : "transparent",
                          transition: "background .15s",
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${isSelected ? "var(--cyan)" : "var(--border)"}`,
                          background: isSelected ? "var(--cyan)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: "var(--bg-0)", transition: "all .15s",
                        }}>
                          {isSelected && "✓"}
                        </div>
                        {/* Avatar */}
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSelected ? "var(--cyan)" : "var(--bg-3)", border: `1px solid ${isSelected ? "var(--cyan)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: isSelected ? "var(--bg-0)" : "var(--text-2)", flexShrink: 0, transition: "all .15s" }}>
                          {c.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? "var(--text-0)" : "var(--text-1)" }}>{c.name}</div>
                          <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)" }}>{c.email}</div>
                        </div>
                        {c.latestInterview && (
                          <span className={`badge ${STATUS_BADGE[c.latestInterview.status] || "badge-ghost"}`} style={{ fontSize: 9 }}>
                            {c.latestInterview.status?.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selected.size > 0 && (
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <span>ℹ</span> Gemini will generate <strong>1 shared question set</strong> and create <strong>{selected.size} individual interview sessions</strong>.
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleAssign} disabled={creating || selected.size === 0}>
                {creating ? <><div className="spinner" />Generating & Assigning…</> : `Assign to ${selected.size} Candidate${selected.size !== 1 ? "s" : ""} →`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Interviews Assigned!</h3>
            <p style={{ color: "var(--text-2)", marginBottom: 24 }}>
              {result?.count} interview{result?.count !== 1 ? "s" : ""} created with the same question bank.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn btn-primary btn-lg" onClick={onClose}>View Project →</button>
              <button className="btn btn-ghost btn-lg" onClick={() => { setStep(1); setAnalysis(null); setJd(""); setSelected(new Set()); setResult(null); }}>Assign More</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectDetail({ navigate, projectId }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [error,      setError]      = useState("");
  const [filter,     setFilter]     = useState("all"); // all|pending|in_progress|completed|terminated

  const load = () => {
    if (!projectId) { setError("No project ID"); setLoading(false); return; }
    api.getProject(projectId)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId]);

  if (loading) return (
    <div className="page-wrapper"><div className="bg-grid" /><Navbar navigate={navigate} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
        <div style={{ textAlign: "center" }}><div className="spinner spinner-lg" style={{ margin: "0 auto 16px" }} /></div>
      </div>
    </div>
  );
  if (error || !data) return (
    <div className="page-wrapper"><div className="bg-grid" /><Navbar navigate={navigate} />
      <div className="container" style={{ paddingTop: 40 }}><div className="alert alert-error"><span>⚠</span>{error}</div><button className="btn btn-ghost" onClick={() => navigate("hr-projects")}>← Back</button></div>
    </div>
  );

  const { project, interviews, stats } = data;
  const filtered = filter === "all" ? interviews : interviews.filter((i) => i.status === filter);
  const progressPct = stats.total > 0 ? Math.round(((stats.completed + stats.terminated) / stats.total) * 100) : 0;

  return (
    <div className="page-wrapper animate-fadeIn">
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
      <Navbar navigate={navigate} />

      {showAssign && (
        <BulkAssignModal
          project={project}
          onClose={() => setShowAssign(false)}
          onDone={() => { setLoading(true); load(); }}
        />
      )}

      <div className="container-lg" style={{ paddingTop: 40, paddingBottom: 60 }}>
        {/* Breadcrumb */}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("hr-projects")} style={{ marginBottom: 20 }}>
          ← All Projects
        </button>

        {/* Project header */}
        <div className="card card-pad mb-6" style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>{project.name}</h1>
              <span className={`badge ${project.status === "active" ? "badge-green" : "badge-ghost"} badge-dot`}>{project.status}</span>
            </div>
            {project.description && <p style={{ fontSize: 14, color: "var(--text-1)", marginBottom: 12, lineHeight: 1.6 }}>{project.description}</p>}
            {project.jobRole && <div style={{ fontSize: 13, fontFamily: "var(--font-m)", color: "var(--cyan)", marginBottom: 12 }}>{project.jobRole}</div>}
            {project.techStack?.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {project.techStack.map((t) => <span key={t} className="badge badge-ghost" style={{ fontSize: 10 }}>{t}</span>)}
              </div>
            )}
            <div style={{ marginTop: 10, maxWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text-2)" }}>
                <span>Overall progress</span><span style={{ color: "var(--cyan)" }}>{progressPct}%</span>
              </div>
              <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${progressPct}%` }} /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={() => setShowAssign(true)}>＋ Assign Interviews</button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card cyan"><div className="stat-label">Total</div><div className="stat-value cyan">{stats.total}</div><div className="stat-sub">Assigned</div></div>
          <div className="stat-card green"><div className="stat-label">Completed</div><div className="stat-value green">{stats.completed}</div></div>
          <div className="stat-card amber"><div className="stat-label">Pending</div><div className="stat-value amber">{stats.pending + stats.inProgress}</div></div>
          {stats.terminated > 0 && <div className="stat-card" style={{ borderTop: "2px solid var(--red)" }}><div className="stat-label">Violated</div><div className="stat-value" style={{ color: "var(--red)" }}>{stats.terminated}</div></div>}
          {stats.avgScore != null && <div className="stat-card purple"><div className="stat-label">Avg Score</div><div className="stat-value purple">{stats.avgScore}%</div></div>}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {[["all", "All"], ["pending", "Pending"], ["in_progress", "In Progress"], ["completed", "Completed"], ["terminated", "Terminated"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: "var(--font-m)", fontWeight: 600,
              border: `1px solid ${filter === val ? "var(--cyan)" : "var(--border)"}`,
              background: filter === val ? "var(--cyan-soft)" : "transparent",
              color: filter === val ? "var(--cyan)" : "var(--text-2)", cursor: "pointer", transition: "all .15s",
            }}>{label} {val === "all" ? `(${interviews.length})` : `(${interviews.filter((i) => i.status === val).length})`}</button>
          ))}
        </div>

        {/* Interviews table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>{filter === "all" ? "No interviews assigned yet." : `No ${filter.replace("_", " ")} interviews.`}</div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr><th>Candidate</th><th>Mode</th><th>Difficulty</th><th>Status</th><th>Score</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filtered.map((iv) => {
                    const isTerminated = iv.status === "terminated";
                    return (
                      <tr key={iv._id} style={{ opacity: isTerminated ? 0.85 : 1 }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: isTerminated ? "var(--red-dim)" : "var(--cyan-soft)", border: `1px solid ${isTerminated ? "rgba(255,77,106,.3)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: isTerminated ? "var(--red)" : "var(--cyan)", flexShrink: 0 }}>
                              {iv.candidate?.name?.[0] || "?"}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-0)" }}>{iv.candidate?.name}</div>
                              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)" }}>{iv.candidate?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`badge ${iv.mode === "mcq" ? "badge-cyan" : "badge-purple"}`}>{iv.mode?.toUpperCase()}</span></td>
                        <td><span className={`badge ${DIFF_BADGE[iv.difficulty]}`}>{iv.difficulty}</span></td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span className={`badge badge-dot ${STATUS_BADGE[iv.status] || "badge-ghost"}`}>
                              {isTerminated ? `${TERM_ICON[iv.terminationReason] || "⛔"} terminated` : iv.status?.replace("_", " ")}
                            </span>
                            {isTerminated && iv.terminationReason && (
                              <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text-3)" }}>
                                {iv.terminationReason === "look_away" ? "look-away" : "tab switch"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {iv.score?.percentage != null ? (
                            <div>
                              <span style={{ fontFamily: "var(--font-m)", fontWeight: 700, fontSize: 14, color: isTerminated ? "var(--red)" : iv.score.percentage >= 80 ? "var(--green)" : iv.score.percentage >= 60 ? "var(--cyan)" : "var(--red)" }}>
                                {iv.score.percentage}%
                              </span>
                              {iv.score.isPartial && <div style={{ fontSize: 10, color: "var(--amber)", fontFamily: "var(--font-m)" }}>partial</div>}
                            </div>
                          ) : <span style={{ color: "var(--text-3)", fontFamily: "var(--font-m)" }}>—</span>}
                        </td>
                        <td style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--text-2)" }}>
                          {new Date(iv.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          {(iv.status === "completed" || iv.status === "terminated")
                            ? <button className="btn btn-outline btn-sm" onClick={() => navigate("hr-report", { interviewId: iv._id })}>View Report</button>
                            : <span className="badge badge-ghost">{iv.status?.replace("_", " ")}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
