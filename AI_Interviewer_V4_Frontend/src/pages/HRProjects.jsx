import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const COLOR_MAP = {
  cyan:   { bg: "var(--cyan-soft)",   border: "rgba(0,229,255,.25)",   text: "var(--cyan)",   top: "var(--cyan)" },
  green:  { bg: "var(--green-dim)",   border: "rgba(0,255,178,.25)",   text: "var(--green)",  top: "var(--green)" },
  amber:  { bg: "var(--amber-dim)",   border: "rgba(255,184,48,.25)",  text: "var(--amber)",  top: "var(--amber)" },
  purple: { bg: "var(--purple-dim)",  border: "rgba(181,123,255,.25)", text: "var(--purple)", top: "var(--purple)" },
  red:    { bg: "var(--red-dim)",     border: "rgba(255,77,106,.25)",  text: "var(--red)",    top: "var(--red)" },
};

const COLORS = ["cyan", "green", "amber", "purple", "red"];

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", description: "", color: "cyan", deadline: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Project name is required"); return; }
    setSaving(true);
    try {
      await onCreate(form);
      onClose();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(5,8,16,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card card-pad animate-scaleIn" style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>New Project</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>Group interviews by event or hiring round</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {err && <div className="alert alert-error mb-4"><span>⚠</span>{err}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" placeholder="e.g. Q3 Frontend Hiring, Campus Drive 2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" style={{ minHeight: 80 }} placeholder="What's this hiring round about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Deadline (optional)</label>
            <input className="form-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Color Tag</label>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                  width: 32, height: 32, borderRadius: "50%", border: `3px solid ${form.color === c ? "white" : "transparent"}`,
                  background: COLOR_MAP[c].text, cursor: "pointer", transition: "border 0.15s",
                  boxShadow: form.color === c ? `0 0 0 2px ${COLOR_MAP[c].text}` : "none",
                }} />
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-lg full-w" type="submit" disabled={saving}>
            {saving ? <><div className="spinner" />Creating…</> : "Create Project →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function HRProjects({ navigate }) {
  const { user } = useAuth();
  const [projects, setProjects]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error,    setError]      = useState("");

  const load = () => {
    setLoading(true);
    api.listProjects().then((d) => setProjects(d.projects)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (form) => {
    await api.createProject(form);
    load();
  };

  if (loading) return (
    <div className="page-wrapper"><div className="bg-grid" /><Navbar navigate={navigate} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
        <div style={{ textAlign: "center" }}><div className="spinner spinner-lg" style={{ margin: "0 auto 16px" }} /><div style={{ fontFamily: "var(--font-m)", fontSize: 12, color: "var(--text-2)" }}>Loading projects…</div></div>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper animate-fadeIn">
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
      <Navbar navigate={navigate} />

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}

      <div className="container-lg" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-sub">Welcome back, {user?.name?.split(" ")[0]} · Group interviews by hiring event</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate("hr-dashboard-legacy")}>All Interviews</button>
            <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>＋ New Project</button>
          </div>
        </div>

        {error && <div className="alert alert-error mb-4"><span>⚠</span>{error}</div>}

        {projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📂</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>No projects yet</h2>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
              Create a project to organise your interviews by hiring round, department, or event.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>Create First Project →</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
            {projects.map((p) => {
              const c = COLOR_MAP[p.color] || COLOR_MAP.cyan;
              const s = p.stats || {};
              const progressPct = s.total > 0 ? Math.round(((s.completed + s.terminated) / s.total) * 100) : 0;
              return (
                <div key={p._id}
                  className="card"
                  onClick={() => navigate("project-detail", { projectId: p._id })}
                  style={{
                    cursor: "pointer", position: "relative", overflow: "hidden",
                    padding: "24px", transition: "transform .2s, box-shadow .2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-glow)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  {/* Color top bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${c.top},transparent)` }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: c.bg, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      📋
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className={`badge ${p.status === "active" ? "badge-green" : "badge-ghost"} badge-dot`}>{p.status}</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-0)", marginBottom: 6, lineHeight: 1.3 }}>{p.name}</h3>
                  {p.description && <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                  {p.jobRole && <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: c.text, marginBottom: 14 }}>{p.jobRole}</div>}

                  {/* Progress */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)" }}>
                      <span>Progress</span>
                      <span style={{ color: c.text }}>{s.completed || 0}/{s.total || 0} done</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg,${c.text}88,${c.top})`, boxShadow: `0 0 6px ${c.top}` }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, fontSize: 12, fontFamily: "var(--font-m)", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--text-2)" }}>👥 {s.total || 0} candidates</span>
                    {s.avgScore != null && <span style={{ color: c.text }}>⭐ Avg {s.avgScore}%</span>}
                    {s.terminated > 0 && <span style={{ color: "var(--red)" }}>⛔ {s.terminated} violated</span>}
                    {p.deadline && (
                      <span style={{ color: new Date(p.deadline) < new Date() ? "var(--red)" : "var(--text-2)" }}>
                        📅 {new Date(p.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* New project card */}
            <div
              className="card"
              onClick={() => setShowModal(true)}
              style={{
                padding: 24, cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12, minHeight: 200,
                border: "1px dashed var(--border)", background: "var(--bg-glass)",
                transition: "border-color .2s, background .2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cyan)"; e.currentTarget.style.background = "var(--cyan-soft)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = "var(--bg-glass)"; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>＋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>New Project</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
