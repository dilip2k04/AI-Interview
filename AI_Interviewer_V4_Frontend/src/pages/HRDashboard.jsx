import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_BADGE = {
  completed: "badge-green", pending: "badge-ghost",
  in_progress: "badge-amber", expired: "badge-red", terminated: "badge-red",
};
const DIFF_BADGE = { easy: "badge-green", medium: "badge-amber", hard: "badge-red" };
const TERM_ICON  = { look_away: "👁️", tab_switch: "🚫" };

function ScoreBar({ score, isPartial }) {
  if (score == null) return <span style={{ color: "var(--text-3)", fontFamily: "var(--font-m)", fontSize: 13 }}>—</span>;
  const c = score >= 80 ? "green" : score >= 60 ? "" : "red";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 80 }}>
          <div className="progress-bar-wrap">
            <div className={`progress-bar-fill ${c}`} style={{ width: `${score}%` }} />
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-m)", fontSize: 13, color: score >= 80 ? "var(--green)" : score >= 60 ? "var(--cyan)" : "var(--red)", fontWeight: 700, minWidth: 36, textAlign: "right" }}>
          {score}%
        </span>
      </div>
      {isPartial && (
        <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--amber)", marginTop: 2 }}>
          ⚠ partial
        </div>
      )}
    </div>
  );
}

export default function HRDashboard({ navigate }) {
  const { user } = useAuth();
  const [stats,      setStats]      = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => {
    Promise.all([api.getHRStats(), api.getHRInterviews()])
      .then(([s, i]) => { setStats(s.stats); setInterviews(i.interviews); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-wrapper">
      <div className="bg-grid" /><Navbar navigate={navigate} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner spinner-lg" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--text-2)" }}>Loading dashboard…</div>
        </div>
      </div>
    </div>
  );

  const terminated = interviews.filter((i) => i.status === "terminated").length;

  return (
    <div className="page-wrapper animate-fadeIn">
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
      <Navbar navigate={navigate} />
      <div className="container-lg" style={{ paddingTop: 40, paddingBottom: 60 }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">HR Dashboard</h1>
            <p className="page-sub">Welcome back, {user?.name?.split(" ")[0]} · {user?.company || "Your Company"}</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("create-interview")}>＋ New Interview</button>
        </div>

        {error && <div className="alert alert-error"><span>⚠</span>{error}</div>}

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card cyan">
            <div className="stat-label">Total Interviews</div>
            <div className="stat-value cyan">{stats?.total || 0}</div>
            <div className="stat-sub">Created by you</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Completed</div>
            <div className="stat-value green">{stats?.completed || 0}</div>
            <div className="stat-sub">Fully scored</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Pending</div>
            <div className="stat-value amber">{stats?.pending || 0}</div>
            <div className="stat-sub">Awaiting candidate</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Avg Score</div>
            <div className="stat-value purple">{stats?.avgScore || 0}%</div>
            <div className="stat-sub">Across completed</div>
          </div>
          {terminated > 0 && (
            <div className="stat-card" style={{ borderTop: "2px solid var(--red)" }}>
              <div className="stat-label">Terminated</div>
              <div className="stat-value" style={{ color: "var(--red)" }}>{terminated}</div>
              <div className="stat-sub">Proctoring violations</div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="card">
          <div style={{ padding: "20px 24px 0" }}>
            <div className="section-title">Interview Sessions</div>
            <div className="section-sub">{interviews.length} interview(s) created</div>
          </div>
          <div className="divider" style={{ margin: "16px 0 0" }} />
          {interviews.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              No interviews yet. Create your first one!
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th><th>Role</th><th>Mode</th><th>Difficulty</th>
                    <th>Status</th><th>Score</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((iv) => (
                    <tr key={iv._id} style={{ opacity: iv.status === "terminated" ? 0.85 : 1 }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: iv.status === "terminated" ? "var(--red-dim)" : "var(--cyan-soft)",
                            border: `1px solid ${iv.status === "terminated" ? "rgba(255,77,106,.3)" : "var(--border)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: 13,
                            color: iv.status === "terminated" ? "var(--red)" : "var(--cyan)",
                            flexShrink: 0,
                          }}>
                            {iv.candidate?.name?.[0] || "?"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-0)", fontSize: 14 }}>{iv.candidate?.name || "Unknown"}</div>
                            <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-m)" }}>{iv.candidate?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-0)", fontWeight: 500 }}>{iv.jobRole}</td>
                      <td><span className={`badge ${iv.mode === "mcq" ? "badge-cyan" : "badge-purple"}`}>{iv.mode?.toUpperCase()}</span></td>
                      <td><span className={`badge ${DIFF_BADGE[iv.difficulty]}`}>{iv.difficulty}</span></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span className={`badge badge-dot ${STATUS_BADGE[iv.status] || "badge-ghost"}`}>
                            {iv.status === "terminated"
                              ? `${TERM_ICON[iv.terminationReason] || "⛔"} terminated`
                              : iv.status?.replace("_", " ")}
                          </span>
                          {iv.status === "terminated" && iv.terminationReason && (
                            <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text-3)" }}>
                              {iv.terminationReason === "look_away" ? "look-away" : "tab switch"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <ScoreBar score={iv.score?.percentage} isPartial={iv.score?.isPartial} />
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
