import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import HRProjects from "./pages/HRProjects.jsx";
import HRDashboard from "./pages/HRDashboard.jsx";
import ProjectDetail from "./pages/ProjectDetail.jsx";
import CreateInterview from "./pages/CreateInterview.jsx";
import HRReport from "./pages/HRReport.jsx";
import CandidateDashboard from "./pages/CandidateDashboard.jsx";
import MCQInterview from "./pages/MCQInterview.jsx";
import VirtualInterview from "./pages/VirtualInterview.jsx";
import InterviewComplete from "./pages/InterviewComplete.jsx";
import "./styles/global.css";

function Router() {
  const { user, loading } = useAuth();
  const [page, setPage]       = useState("home");   // default = landing
  const [pageProps, setPageProps] = useState({});

  const navigate = (to, props = {}) => {
    setPage(to);
    setPageProps(props);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg-0)" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"var(--font-m)", fontSize:14, color:"var(--cyan)", letterSpacing:".1em", marginBottom:16 }}>AI INTERVIEWER</div>
          <div className="spinner spinner-lg" style={{ margin:"0 auto" }} />
        </div>
      </div>
    );
  }

  const props = { navigate, ...pageProps };

  // ── If already logged in and somehow on home/login — redirect to dashboard ──
  if (user && (page === "home" || page === "login")) {
    const dest = user.role === "hr" ? "hr-projects" : "candidate-dashboard";
    setTimeout(() => navigate(dest), 0);
    return null;
  }

  // ── Not logged in and trying to access protected pages ──
  if (!user && page !== "home" && page !== "login") {
    setTimeout(() => navigate("home"), 0);
    return null;
  }

  return (
    <div>
      {/* ── Public ─────────────────────────────────────────── */}
      {page === "home"  && <LandingPage {...props} />}
      {page === "login" && <LoginPage   {...props} />}

      {/* ── HR pages ─────────────────────────────────────────── */}
      {page === "hr-projects"         && user?.role === "hr" && <HRProjects    {...props} />}
      {page === "project-detail"      && user?.role === "hr" && <ProjectDetail  {...props} />}
      {page === "hr-dashboard"        && user?.role === "hr" && <HRProjects    {...props} />}       {/* alias */}
      {page === "hr-dashboard-legacy" && user?.role === "hr" && <HRDashboard   {...props} />}
      {page === "create-interview"    && user?.role === "hr" && <CreateInterview {...props} />}
      {page === "hr-report"           && user?.role === "hr" && <HRReport      {...props} />}

      {/* ── Candidate pages ──────────────────────────────────── */}
      {page === "candidate-dashboard" && user?.role === "candidate" && <CandidateDashboard {...props} />}
      {page === "mcq-interview"       && user?.role === "candidate" && <MCQInterview       {...props} />}
      {page === "virtual-interview"   && user?.role === "candidate" && <VirtualInterview   {...props} />}
      {page === "interview-complete"  && user?.role === "candidate" && <InterviewComplete  {...props} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
