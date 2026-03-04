import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api.js";
import { useProctor } from "../hooks/useProctor.js";
import CameraMonitor from "../components/CameraMonitor.jsx";
import TerminationOverlay from "../components/TerminationOverlay.jsx";
import PermissionGate from "../components/PermissionGate.jsx";

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const TAB_SWITCH_LIMIT = 3;

export default function MCQInterview({ navigate, interviewId }) {
  // ── phase: "permissions" → "ready" → "active" ─────────────────────────
  const [phase, setPhase] = useState("permissions"); // permissions | ready | active
  const [permGranted, setPermGranted] = useState(false);

  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");

  // ── Tab switch warning toast ───────────────────────────────────────────
  const [tabWarning, setTabWarning] = useState(null); // { count, remaining }
  const warnTimerRef = useRef(null);

  // ── Termination state ──────────────────────────────────────────────────
  const [terminationVisible, setTerminationVisible] = useState(false);
  const [terminationReason, setTerminationReason] = useState(null);
  const [termSaving, setTermSaving] = useState(false);
  const terminatingRef = useRef(false);

  const answersRef = useRef({});
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Store the camera stream persistently
  const streamRef = useRef(null);

  // ── Load interview data ────────────────────────────────────────────────
  useEffect(() => {
    if (!interviewId) {
      setError("No interview ID");
      setLoadingPage(false);
      return;
    }
    api.getInterview(interviewId)
      .then((d) => {
        setInterview(d.interview);
        setQuestions(d.interview.questions || []);
        setTimeLeft((d.interview.durationMinutes || 45) * 60);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingPage(false));
  }, [interviewId]);

  // ── Tab-switch warning handler ─────────────────────────────────────────
  const handleTabSwitchWarning = useCallback((count, remaining) => {
    clearTimeout(warnTimerRef.current);
    setTabWarning({ count, remaining });
    warnTimerRef.current = setTimeout(() => setTabWarning(null), 4000);
  }, []);

  // ── Proctoring violation handler ───────────────────────────────────────
  const handleProctoringViolation = useCallback(async (reason) => {
    if (terminatingRef.current) return;
    terminatingRef.current = true;
    setTerminationReason(reason);
    setTerminationVisible(true);
    setTermSaving(true);

    const partial = Object.entries(answersRef.current).map(([questionId, selectedOption]) => ({
      questionId, selectedOption,
    }));

    try {
      await api.terminateInterview(interviewId, reason, partial, proctorSnapshot(), []);
    } catch (e) {
      console.error("[Termination] API error:", e.message);
    } finally {
      setTermSaving(false);
    }
  }, [interviewId]);

  // Only enable proctor when in "active" phase and video element exists
  const proctorEnabled = phase === "active" && !terminatingRef.current;

  const {
    videoRef,
    canvasRef,
    proctorState,
    snapshot: proctorSnapshot,
  } = useProctor({
    enabled: proctorEnabled,
    permissionsGranted: permGranted && phase === "active",
    onTerminate: handleProctoringViolation,
    onTabSwitchWarning: handleTabSwitchWarning,
  });

  // ── Re-attach stream when video element is mounted ─────────────────────
  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const stream = streamRef.current;

    console.log("[MCQ] Attaching persistent stream to video element");

    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.play()
        .then(() => console.log("[MCQ] Live video playback started successfully"))
        .catch(err => console.error("[MCQ] Video play failed:", err.message));
    }
  }, [videoRef.current, phase]);

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "active" || submitting || terminatingRef.current) return;
    const t = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          handleSubmit();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, submitting]);

  // ── Permission granted callback ────────────────────────────────────────
  const onPermissionsGranted = useCallback((stream) => {
    console.log("[MCQ] Camera permission granted → stream ready", stream?.getTracks().map(t => t.kind));

    // IMPORTANT: Do NOT stop the tracks here!
    streamRef.current = stream;

    setPermGranted(true);
    setPhase("ready");

    // Early attempt to assign (may not work yet if video not mounted)
    if (videoRef.current && stream) {
      console.log("[MCQ] Early stream assignment in ready phase");
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn("[MCQ] Early play failed:", e));
    }
  }, [videoRef]);

  // ── Start interview ────────────────────────────────────────────────────
  const startInterview = async () => {
    try {
      await api.startInterview(interviewId);
      setPhase("active");
      document.documentElement.requestFullscreen?.().catch(() => {});
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Answer handling ────────────────────────────────────────────────────
  const handleAnswer = (key) => {
    const qId = questions[current]._id;
    setAnswers((prev) => ({ ...prev, [qId]: key }));
  };

  // ── Submit answers ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting || terminatingRef.current) return;
    setSubmitting(true);
    try {
      const ansArr = Object.entries(answersRef.current).map(([questionId, selectedOption]) => ({
        questionId, selectedOption,
      }));
      const result = await api.submitMCQ(interviewId, ansArr, proctorSnapshot());
      navigate("interview-complete", { interviewId, completedInterview: result.interview });
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }, [submitting, interviewId, navigate, proctorSnapshot]);

  // ── Loading guard ──────────────────────────────────────────────────────
  if (loadingPage) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg-0)" }}>
      <div style={{ textAlign:"center" }}>
        <div className="spinner spinner-lg" style={{ margin:"0 auto 16px" }} />
        <div style={{ fontFamily:"var(--font-m)", fontSize:12, color:"var(--text-2)" }}>Loading interview…</div>
      </div>
    </div>
  );

  if (error && phase === "permissions") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg-0)" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:"0 24px" }}>
        <div className="alert alert-error"><span>⚠</span>{error}</div>
        <button className="btn btn-ghost" onClick={() => navigate("candidate-dashboard")}>← Back</button>
      </div>
    </div>
  );

  const timerClass = timeLeft < 300 ? "danger" : timeLeft < 600 ? "warning" : "";
  const q = questions[current];
  const tabsLeft = TAB_SWITCH_LIMIT - (proctorState.tabSwitches || 0);

  // ──────────────────────────────────────────────────────────────────────
  // PHASE: permissions
  // ──────────────────────────────────────────────────────────────────────
  if (phase === "permissions") {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--bg-0)", position:"relative" }}>
        <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
        <div className="container-sm" style={{ position:"relative", zIndex:1, padding:"0 24px" }}>
          <div className="card card-pad-lg animate-scaleIn" style={{ maxWidth:500, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:8 }}>
              <span className="badge badge-cyan" style={{ marginBottom:16, display:"inline-flex" }}>
                MCQ Interview · {interview?.jobRole || "Loading…"}
              </span>
            </div>
            <PermissionGate requireMic={false} onGranted={onPermissionsGranted} onDenied={() => {}} />
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // PHASE: ready (permissions granted, rules + start button)
  // ──────────────────────────────────────────────────────────────────────
  if (phase === "ready") {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--bg-0)", position:"relative" }}>
        <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
        <div className="container-sm" style={{ position:"relative", zIndex:1, padding:"0 24px" }}>
          <div className="card card-pad-lg animate-scaleIn" style={{ textAlign:"center" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"var(--green-dim)", border:"2px solid rgba(0,255,178,.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 20px" }}>✅</div>
            <h1 style={{ fontSize:26, fontWeight:800, marginBottom:8 }}>{interview?.jobRole}</h1>
            <p style={{ color:"var(--text-2)", fontSize:14, marginBottom:28, fontFamily:"var(--font-m)" }}>
              {questions.length} questions · {interview?.durationMinutes} min · {interview?.difficulty}
            </p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:28 }}>
              {[
                { icon:"📷", label:"Camera Active",   sub:"Face detected" },
                { icon:"🖥",  label:"Fullscreen Mode", sub:"Do not exit" },
                { icon:"⏱",  label:"Timed Session",   sub:`${interview?.durationMinutes} min` },
              ].map((item) => (
                <div key={item.label} style={{ padding:"16px 12px", background:"var(--bg-2)", borderRadius:"var(--radius-md)", border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>{item.icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--text-0)", marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:11, fontFamily:"var(--font-m)", color:"var(--text-2)" }}>{item.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign:"left", marginBottom:24, padding:"16px 18px", background:"var(--red-dim)", border:"1px solid rgba(255,77,106,.25)", borderRadius:"var(--radius-md)" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--red)", marginBottom:10, fontFamily:"var(--font-m)", textTransform:"uppercase", letterSpacing:"0.08em" }}>⚠ Proctoring Rules</div>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {[
                  "Keep your face visible to the camera at all times",
                  "Looking away for more than 5 seconds will terminate the test",
                  `You have ${TAB_SWITCH_LIMIT} tab-switch warnings — the 3rd terminates the test`,
                  "Only answers submitted before termination will be scored",
                ].map((rule, i) => (
                  <div key={i} style={{ display:"flex", gap:8, fontSize:13, color:"var(--text-1)" }}>
                    <span style={{ color:"var(--red)", flexShrink:0, fontFamily:"var(--font-m)" }}>{String(i+1).padStart(2,"0")}</span>
                    {rule}
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="alert alert-error mb-4"><span>⚠</span>{error}</div>}
            <button className="btn btn-primary btn-xl full-w" onClick={startInterview}>Begin Interview →</button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  // ──────────────────────────────────────────────────────────────────────
  // PHASE: active interview
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-0)", display:"flex", flexDirection:"column" }}>
      <div className="bg-grid" />

      {/* Termination overlay */}
      {terminationVisible && (
        <TerminationOverlay reason={terminationReason} saving={termSaving} onExit={() => navigate("candidate-dashboard")} />
      )}

      {/* Tab-switch warning toast */}
      {tabWarning && (
        <div style={{
          position:"fixed", top:80, left:"50%", transform:"translateX(-50%)",
          zIndex:500, padding:"12px 24px",
          background:"rgba(255,184,48,0.12)", border:"1px solid rgba(255,184,48,0.4)",
          borderRadius:"var(--radius-md)", backdropFilter:"blur(12px)",
          display:"flex", alignItems:"center", gap:12,
          animation:"scaleIn 0.2s ease",
          boxShadow:"0 4px 24px rgba(255,184,48,.2)",
        }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--amber)" }}>
              Tab switch warning {tabWarning.count}/{TAB_SWITCH_LIMIT}
            </div>
            <div style={{ fontSize:12, color:"var(--text-2)", fontFamily:"var(--font-m)" }}>
              {tabWarning.remaining > 0
                ? `${tabWarning.remaining} more will terminate the test`
                : "Next switch will terminate the test!"}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:"rgba(5,8,16,.95)", backdropFilter:"blur(20px)", borderBottom:"1px solid var(--border)", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontFamily:"var(--font-m)", fontSize:12, color:"var(--text-2)" }}>Q</span>
          <span style={{ fontFamily:"var(--font-m)", fontSize:14, fontWeight:700, color:"var(--text-0)" }}>{current+1} / {questions.length}</span>
          <span className="badge badge-cyan">{q.topic}</span>
        </div>
        <div className={`timer-display ${timerClass}`}><span>⏱</span>{fmt(timeLeft)}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Tab switch counter */}
          <div style={{
            display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20,
            background: tabsLeft <= 1 ? "var(--red-dim)" : tabsLeft === 2 ? "var(--amber-dim)" : "var(--bg-2)",
            border:`1px solid ${tabsLeft <= 1 ? "rgba(255,77,106,.3)" : tabsLeft === 2 ? "rgba(255,184,48,.3)" : "var(--border)"}`,
          }}>
            <span style={{ fontSize:10, fontFamily:"var(--font-m)", fontWeight:700, color: tabsLeft <= 1 ? "var(--red)" : tabsLeft === 2 ? "var(--amber)" : "var(--text-2)" }}>
              ⚠ {tabsLeft} switch{tabsLeft !== 1 ? "es" : ""} left
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background: proctorState.faceDetected ? "var(--green-dim)" : "var(--red-dim)", border:`1px solid ${proctorState.faceDetected ? "rgba(0,255,178,.2)" : "rgba(255,77,106,.2)"}`, transition:"all 0.3s" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: proctorState.faceDetected ? "var(--green)" : "var(--red)", animation:"pulse 1.5s infinite" }} />
            <span style={{ fontSize:10, fontFamily:"var(--font-m)", fontWeight:700, color: proctorState.faceDetected ? "var(--green)" : "var(--red)" }}>
              {proctorState.faceDetected ? "FACE OK" : "NO FACE"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:"var(--bg-3)" }}>
        <div style={{ height:"100%", width:`${((current+1)/questions.length)*100}%`, background:"linear-gradient(90deg,var(--cyan-dim),var(--cyan))", transition:"width .4s ease", boxShadow:"0 0 8px var(--cyan)" }} />
      </div>

      <div style={{ flex:1, position:"relative", zIndex:1, display:"flex" }}>
        {/* Question column */}
        <div style={{ flex:1, padding:"36px 48px", maxWidth:800, margin:"0 auto", width:"100%" }}>
          {error && <div className="alert alert-error mb-4"><span>⚠</span>{error}</div>}
          <div className="card card-pad animate-fadeIn" key={current} style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontFamily:"var(--font-m)", color:"var(--text-2)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Q{current+1} · {q.topic}</div>
            <h2 style={{ fontSize:18, fontWeight:600, color:"var(--text-0)", lineHeight:1.6, marginBottom:28 }}>{q.questionText}</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {q.options && Object.entries(q.options).map(([key, text]) => (
                <button key={key} className={`mcq-option ${answers[q._id] === key ? "selected" : ""}`} onClick={() => handleAnswer(key)}>
                  <span className="mcq-option-key">{key}</span>
                  <span style={{ flex:1, textAlign:"left" }}>{text}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"space-between", alignItems:"center" }}>
            <button className="btn btn-ghost" onClick={() => setCurrent(Math.max(0, current-1))} disabled={current===0}>← Prev</button>
            <div style={{ display:"flex", gap:6 }}>
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} style={{ width:32, height:32, borderRadius:"var(--radius-sm)", border:"1px solid", background: i===current ? "var(--cyan)" : answers[questions[i]._id] ? "var(--cyan-soft)" : "var(--bg-2)", borderColor: i===current ? "var(--cyan)" : answers[questions[i]._id] ? "rgba(0,229,255,.3)" : "var(--border)", color: i===current ? "var(--bg-0)" : answers[questions[i]._id] ? "var(--cyan)" : "var(--text-2)", fontSize:12, fontFamily:"var(--font-m)", fontWeight:700, cursor:"pointer", transition:"all .15s" }}>{i+1}</button>
              ))}
            </div>
            {current < questions.length - 1
              ? <button className="btn btn-primary" onClick={() => setCurrent(current+1)}>Next →</button>
              : <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>{submitting ? <><div className="spinner" />Submitting…</> : "Submit ✓"}</button>}
          </div>
        </div>

        {/* Proctor sidebar */}
        <div style={{ width:220, borderLeft:"1px solid var(--border)", padding:16, background:"rgba(9,13,26,.85)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <CameraMonitor videoRef={videoRef} canvasRef={canvasRef} proctorState={proctorState} />
        </div>
      </div>
    </div>
  );
}