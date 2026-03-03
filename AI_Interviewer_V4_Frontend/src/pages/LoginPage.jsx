import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage({ navigate }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState("hr");
  const [subTab, setSubTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", company: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "hr" ? "hr-projects" : "candidate-dashboard");
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      // Use customCompany if "Other" is selected
      const companyName = regForm.company === "Other" ? regForm.customCompany : regForm.company;
      const user = await register({ 
        ...regForm, 
        company: companyName,
        role: tab 
      });
      navigate(user.role === "hr" ? "hr-projects" : "candidate-dashboard");
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const fillDemo = () => {
    if (tab === "hr") setForm({ email: "hr@company.com", password: "hr123456" });
    else setForm({ email: "alex@email.com", password: "pass1234" });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", position: "relative" }}>
      <div className="bg-grid" /><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, padding: "0 24px" }}>
        {/* Back to landing */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => navigate("home")}
            style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-2)", fontFamily:"var(--font-m)", fontSize:12, display:"flex", alignItems:"center", gap:6, transition:"color .18s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-0)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-2)"}
          >
            ← Back to home
          </button>
        </div>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: "var(--cyan-soft)", border: "1px solid var(--border)", marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🤖</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-d)", fontSize: 28, fontWeight: 800, color: "var(--text-0)", letterSpacing: "-.03em" }}>AI Interviewer</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, fontFamily: "var(--font-m)" }}>Intelligent Technical Hiring Platform</p>
        </div>

        <div className="card card-pad animate-scaleIn">
          {/* Role Tabs */}
          <div className="tabs">
            {/* <button className={`tab-btn ${tab === "hr" ? "active" : ""}`} onClick={() => { setTab("hr"); setSubTab("login"); setError(""); }}>👔 HR Portal</button> */}
            <button className={`tab-btn ${tab === "hr" ? "active" : ""}`} onClick={() => { setTab("hr"); setSubTab("login"); setError(""); setRegForm({ name: "", email: "", password: "", company: "" }); }}>👔 HR Portal</button>
            <button className={`tab-btn ${tab === "candidate" ? "active" : ""}`} onClick={() => { setTab("candidate"); setError(""); }}>👤 Candidate</button>
          </div>

          {/* Candidate sub-tabs */}
          {tab === "candidate" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["login", "register"].map((t) => (
                <button key={t} onClick={() => { setSubTab(t); setError(""); }}
                  style={{ flex: 1, padding: "8px", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-d)", borderRadius: "var(--radius-sm)", border: subTab === t ? "1px solid var(--cyan)" : "1px solid var(--border)", background: subTab === t ? "var(--cyan-soft)" : "transparent", color: subTab === t ? "var(--cyan)" : "var(--text-2)", cursor: "pointer", transition: "all .2s", textTransform: "capitalize" }}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* HR sub-tabs */}
          {tab === "hr" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["login", "register"].map((t) => (
                <button key={t} onClick={() => { setSubTab(t); setError(""); }}
                  style={{ flex: 1, padding: "8px", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-d)", borderRadius: "var(--radius-sm)", border: subTab === t ? "1px solid var(--cyan)" : "1px solid var(--border)", background: subTab === t ? "var(--cyan-soft)" : "transparent", color: subTab === t ? "var(--cyan)" : "var(--text-2)", cursor: "pointer", transition: "all .2s", textTransform: "capitalize" }}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>⚠</span>{error}</div>}

          {/* Login form */}
          {(subTab === "login") && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <button className="btn btn-primary btn-lg full-w" type="submit" disabled={loading}>
                {loading ? <><div className="spinner" />Signing in...</> : `Sign in as ${tab === "hr" ? "HR" : "Candidate"}`}
              </button>
            </form>
          )}

          {/* HR Register form */}
          {tab === "hr" && subTab === "register" && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="John Smith" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="hr@company.com" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Company</label>
                <select 
                  className="form-select" 
                  value={regForm.company} 
                  onChange={(e) => setRegForm({ ...regForm, company: e.target.value })} 
                  required
                >
                  <option value="">Select your company</option>
                  <option value="TechCorp Inc.">TechCorp Inc.</option>
                  {/* <option value="DataSystems Ltd.">DataSystems Ltd.</option>
                  <option value="CloudTech Solutions">CloudTech Solutions</option>
                  <option value="AI Innovations">AI Innovations</option>
                  <option value="CyberSec Group">CyberSec Group</option>
                  <option value="FinTech Partners">FinTech Partners</option>
                  <option value="HealthTech Labs">HealthTech Labs</option>
                  <option value="EduTech Systems">EduTech Systems</option> */}
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>
              {regForm.company === "Other" && (
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Company Name</label>
                  <input 
                    className="form-input" 
                    placeholder="Enter your company name" 
                    value={regForm.customCompany || ""} 
                    onChange={(e) => setRegForm({ ...regForm, customCompany: e.target.value })} 
                    required 
                  />
                </div>
              )}
              <button className="btn btn-primary btn-lg full-w" type="submit" disabled={loading}>
                {loading ? <><div className="spinner" />Creating HR account...</> : "Create HR Account"}
              </button>
            </form>
          )}

          {/* Register form */}
          {tab === "candidate" && subTab === "register" && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Alex Kumar" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@email.com" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Resume</label>
                <input className="form-input" type="file" placeholder="Select Resume"  />
              </div>
              <button className="btn btn-primary btn-lg full-w" type="submit" disabled={loading}>
                {loading ? <><div className="spinner" />Creating account...</> : "Create Account"}
              </button>
            </form>
          )}

          {(subTab === "login") && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-m)", color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Demo</div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text-1)" }}>
                {tab === "hr" ? "hr@company.com / hr123456" : "alex@email.com / pass1234"}
              </div>
              <button onClick={fillDemo} className="btn btn-ghost btn-sm" style={{ marginTop: 8, fontSize: 11 }}>Autofill</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
