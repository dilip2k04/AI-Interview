import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const DIFF_COLOR = { easy: "badge-green", medium: "badge-amber", hard: "badge-red" };

export default function CandidateDashboard({ navigate }) {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCandidateInterviews().then((d) => setInterviews(d.interviews)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const pending    = interviews.filter((i) => i.status === "pending");
  const inProgress = interviews.filter((i) => i.status === "in_progress");
  const completed  = interviews.filter((i) => i.status === "completed" || i.status === "terminated");

  const startInterview = (iv) => {
    navigate(iv.mode === "mcq" ? "mcq-interview" : "virtual-interview", { interviewId: iv._id });
  };

  if (loading) return (
    <div className="page-wrapper"><div className="bg-grid" /><Navbar navigate={navigate} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}><div style={{ textAlign: "center" }}><div className="spinner spinner-lg" style={{ margin: "0 auto 16px" }} /><div style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--text-2)" }}>Loading interviews...</div></div></div>
    </div>
  );

  return (
    <div className="page-wrapper animate-fadeIn">
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
      <Navbar navigate={navigate} />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ marginBottom: 36 }}>
          <h1 className="page-title">Welcome, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="page-sub">Your interview assignments</p>
        </div>

        {error && <div className="alert alert-error"><span>⚠</span>{error}</div>}

        <div className="stat-grid">
          <div className="stat-card cyan"><div className="stat-label">Total</div><div className="stat-value cyan">{interviews.length}</div><div className="stat-sub">Assigned interviews</div></div>
          <div className="stat-card amber"><div className="stat-label">Pending</div><div className="stat-value amber">{pending.length + inProgress.length}</div><div className="stat-sub">To complete</div></div>
          <div className="stat-card green"><div className="stat-label">Completed</div><div className="stat-value green">{completed.length}</div><div className="stat-sub">Submitted</div></div>
          <div className="stat-card purple"><div className="stat-label">Best Score</div><div className="stat-value purple">{completed.length ? Math.max(...completed.map((c) => c.score?.percentage || 0)) + "%" : "—"}</div><div className="stat-sub">Highest</div></div>
        </div>

        {/* Pending + In Progress */}
        {(pending.length > 0 || inProgress.length > 0) && (
          <div style={{ marginBottom: 40 }}>
            <div className="section-header"><div><div className="section-title">Upcoming Interviews</div><div className="section-sub">Complete these to submit your application</div></div></div>
            <div className="grid-auto">
              {[...inProgress, ...pending].map((iv) => (
                <div key={iv._id} className="card card-pad" style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${iv.status === "in_progress" ? "var(--amber)" : "var(--cyan)"},transparent)` }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ fontSize: 24 }}>{iv.mode === "mcq" ? "📝" : "🎙️"}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className={`badge ${DIFF_COLOR[iv.difficulty]}`}>{iv.difficulty}</span>
                      <span className="badge badge-cyan">{iv.mode?.toUpperCase()}</span>
                      {iv.status === "in_progress" && <span className="badge badge-amber badge-dot">In Progress</span>}
                    </div>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-0)", marginBottom: 4 }}>{iv.jobRole}</h3>
                  <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14, fontFamily: "var(--font-m)" }}>{iv.hr?.company || iv.hr?.name}</div>
                  {iv.techStack?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      {iv.techStack.map((t) => <span key={t} className="badge badge-ghost" style={{ fontSize: 10 }}>{t}</span>)}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text-2)" }}>
                    <span>📋 {iv.numQuestions} questions</span>
                    <span>⏱ {iv.durationMinutes} min</span>
                  </div>
                  <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 12, padding: "10px 14px" }}>
                    <span>📷</span> Camera required · Fullscreen mode
                  </div>
                  <button className="btn btn-primary full-w" onClick={() => startInterview(iv)}>
                    {iv.status === "in_progress" ? "Resume Interview →" : "Start Interview →"}
                  </button>
                  <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-3)" }}>
                    Assigned: {new Date(iv.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed + Terminated */}
        {completed.length > 0 && (
          <div>
            <div className="section-header"><div><div className="section-title">Past Interviews</div><div className="section-sub">Completed and terminated sessions</div></div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {completed.map((iv) => {
                const isTerminated = iv.status === "terminated";
                const TERM_ICON = { look_away: "👁️", tab_switch: "🚫" };
                return (
                  <div key={iv._id} className="card" style={{
                    display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", flexWrap: "wrap",
                    borderColor: isTerminated ? "rgba(255,77,106,0.25)" : undefined,
                    opacity: isTerminated ? 0.9 : 1,
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: isTerminated ? "var(--red-dim)" : "var(--green-dim)",
                      border: `2px solid ${isTerminated ? "rgba(255,77,106,.3)" : "rgba(0,255,178,.3)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {isTerminated ? (TERM_ICON[iv.terminationReason] || "⛔") : "✓"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-0)", marginBottom: 2 }}>{iv.jobRole}</div>
                      <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text-2)" }}>
                        {iv.hr?.company || iv.hr?.name} · {new Date(iv.completedAt || iv.createdAt).toLocaleDateString()}
                      </div>
                      {isTerminated && (
                        <div style={{ fontSize: 11, color: "var(--red)", fontFamily: "var(--font-m)", marginTop: 3 }}>
                          Terminated: {iv.terminationReason === "look_away" ? "looked away from screen" : "switched tabs"}
                          {iv.score?.isPartial ? " · Partial score recorded" : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className={`badge ${DIFF_COLOR[iv.difficulty]}`}>{iv.difficulty}</span>
                      <span className="badge badge-purple">{iv.mode?.toUpperCase()}</span>
                      {isTerminated && <span className="badge badge-red">Violated</span>}
                      <div style={{
                        fontFamily: "var(--font-m)", fontSize: 20, fontWeight: 800,
                        color: isTerminated ? "var(--red)"
                          : (iv.score?.percentage || 0) >= 80 ? "var(--green)"
                          : (iv.score?.percentage || 0) >= 60 ? "var(--cyan)" : "var(--red)",
                      }}>
                        {iv.score?.percentage ?? 0}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {interviews.length === 0 && !loading && (
          <div className="empty-state"><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>No interviews assigned yet. Check back soon!</div>
        )}
      </div>
    </div>
  );
}
