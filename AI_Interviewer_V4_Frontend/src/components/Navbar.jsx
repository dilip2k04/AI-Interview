import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar({ navigate }) {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const handleLogout = () => { logout(); navigate("login"); };

  return (
    <nav className="navbar">
      {/* Brand — clickable to home */}
      <div
        className="navbar-brand"
        onClick={() => navigate(user?.role === "hr" ? "hr-projects" : "candidate-dashboard")}
        style={{ cursor: "pointer" }}
      >
        <span className="dot" />
        AI Interviewer
      </div>

      {/* HR quick nav */}
      {user?.role === "hr" && (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("hr-projects")}
            style={{ fontSize: 12 }}
          >
            📂 Projects
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("hr-dashboard-legacy")}
            style={{ fontSize: 12 }}
          >
            📋 All Interviews
          </button>
        </div>
      )}

      <div className="navbar-right">
        {user && (
          <>
            <div className="flex items-center gap-2">
              <div className="navbar-avatar">{initials}</div>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-0)", fontWeight: 600, lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-m)" }}>{user.email}</div>
              </div>
            </div>
            <span className="navbar-role-badge">{user.role === "hr" ? "HR" : "Candidate"}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
