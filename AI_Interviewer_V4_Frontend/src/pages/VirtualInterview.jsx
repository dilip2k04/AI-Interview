import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../services/api.js";
import { useProctor } from "../hooks/useProctor.js";
import { useVoiceInput } from "../hooks/useVoiceInput.js";
import CameraMonitor from "../components/CameraMonitor.jsx";
import TerminationOverlay from "../components/TerminationOverlay.jsx";
import PermissionGate from "../components/PermissionGate.jsx";

const TAB_SWITCH_LIMIT = 3;

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function VirtualInterview({ navigate, interviewId }) {

  // ── App phase: permissions → ready → active ───────────────────────────
  const [appPhase,    setAppPhase]   = useState("permissions");
  const [permGranted, setPermGranted] = useState(false);

  // ── Interview data ────────────────────────────────────────────────────
  const [interview,   setInterview]  = useState(null);
  const [started,     setStarted]    = useState(false);
  const [messages,    setMessages]   = useState([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [currentQ,    setCurrentQ]   = useState(null);
  const [inputText,   setInputText]  = useState("");
  const [chatPhase,   setChatPhase]  = useState("loading"); // loading|answering|evaluating|done
  const [timeLeft,    setTimeLeft]   = useState(0);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error,       setError]      = useState("");

  // ── Termination ───────────────────────────────────────────────────────
  const [termVisible, setTermVisible] = useState(false);
  const [termReason,  setTermReason]  = useState(null);
  const [termSaving,  setTermSaving]  = useState(false);
  const terminatingRef = useRef(false);

  // ── Tab-switch warning toast ──────────────────────────────────────────
  const [tabWarn,    setTabWarn]    = useState(null); // { count, remaining }
  const warnTimer                   = useRef(null);

  const chatRef     = useRef(null);
  const textareaRef = useRef(null);
  const convHistRef = useRef([]);

  // ── Load interview data ───────────────────────────────────────────────
  useEffect(() => {
    if (!interviewId) { setError("No interview ID"); setLoadingPage(false); return; }
    api.getInterview(interviewId)
      .then((d) => { setInterview(d.interview); setTimeLeft((d.interview.durationMinutes || 60) * 60); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingPage(false));
  }, [interviewId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Timer — only while active
  useEffect(() => {
    if (!started || chatPhase === "done" || terminatingRef.current) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [started, chatPhase]);

  // ── Voice input ───────────────────────────────────────────────────────
  // onTranscript is stable via useCallback so useVoiceInput never gets stale closures
  const onTranscriptCb = useCallback((committed) => {
    setInputText(committed);
  }, []);

  const { supported: voiceSupported, recording: voiceRecording, interimText,
          startRecording, stopRecording } = useVoiceInput({ onTranscript: onTranscriptCb });

  // inputRef lets handleVoiceToggle always see the latest inputText
  // without needing it as a useCallback dep (avoids stale closure)
  const inputTextRef = useRef("");
  useEffect(() => { inputTextRef.current = inputText; }, [inputText]);

  const handleVoiceToggle = useCallback(() => {
    if (voiceRecording) {
      const final = stopRecording();
      setInputText(final);
    } else {
      startRecording(inputTextRef.current);
    }
  }, [voiceRecording, startRecording, stopRecording]);

  // ── Tab-switch warning callback ───────────────────────────────────────
  const handleTabWarn = useCallback((count, remaining) => {
    clearTimeout(warnTimer.current);
    setTabWarn({ count, remaining });
    warnTimer.current = setTimeout(() => setTabWarn(null), 4500);
  }, []);

  // ── Proctoring violation ──────────────────────────────────────────────
  const handleViolation = useCallback(async (reason) => {
    if (terminatingRef.current) return;
    terminatingRef.current = true;
    setTermReason(reason);
    setTermVisible(true);
    setTermSaving(true);
    try {
      await api.terminateInterview(interviewId, reason, [], proctorSnapshot(), convHistRef.current);
    } catch (e) { console.error("[Terminate]", e.message); }
    finally { setTermSaving(false); }
  }, [interviewId]);

  const { videoRef, canvasRef, proctorState, snapshot: proctorSnapshot } = useProctor({
    enabled:            started && !terminatingRef.current,
    permissionsGranted: permGranted,
    onTerminate:        handleViolation,
    onTabSwitchWarning: handleTabWarn,
  });

  // ── Chat helpers ──────────────────────────────────────────────────────
  const addMsg = useCallback((role, content) => {
    const msg = { role, content, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages((p) => [...p, msg]);
    convHistRef.current.push({ role, content });
  }, []);

  const fetchNextQ = useCallback(async (index) => {
    setChatPhase("loading");
    try {
      const data = await api.virtualNextQuestion(interviewId, index);
      if (data.done) { await finishInterview(); return; }
      setCurrentQ(data.question);
      addMsg("ai", data.question.questionText);
      setChatPhase("answering");
    } catch (e) { setError(e.message); }
  }, [interviewId, addMsg]);

  // ── Permission granted ────────────────────────────────────────────────
  const onPermGranted = (stream) => {
    stream?.getTracks().forEach((t) => t.stop());
    setPermGranted(true);
    setAppPhase("ready");
  };

  // ── Start (from ready screen) ─────────────────────────────────────────
  const startInterview = async () => {
    try {
      await api.startInterview(interviewId);
      document.documentElement.requestFullscreen?.().catch(() => {});
      setStarted(true);
      setAppPhase("active");
      addMsg("ai",
        `Hello! I'm your AI interviewer for the ${interview.jobRole} position.\n\n` +
        `We have ${interview.questions?.length} questions. Keep your face visible and stay on this tab.\n\nLet's begin!`
      );
      setTimeout(() => fetchNextQ(0), 1200);
    } catch (e) { setError(e.message); }
  };

  // ── Send answer ───────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || chatPhase !== "answering" || terminatingRef.current) return;
    // If mic is recording, stop it first and use that text
    if (voiceRecording) { stopRecording(); }
    const text = inputText.trim();
    setInputText("");
    setChatPhase("evaluating");
    addMsg("candidate", text);
    try {
      await api.virtualSubmitResponse(interviewId, {
        questionId: currentQ._id, responseText: text, conversationHistory: convHistRef.current,
      });
      const next = currentQIdx + 1;
      setCurrentQIdx(next);
      if (next >= (interview.questions?.length || 0)) {
        addMsg("ai", "Excellent! All questions covered. Generating your evaluation now…");
        setTimeout(finishInterview, 1200);
      } else {
        setTimeout(() => fetchNextQ(next), 700);
      }
    } catch (e) { setError(e.message); setChatPhase("answering"); }
  };

  const finishInterview = async () => {
    setChatPhase("done");
    try {
      const result = await api.completeVirtual(interviewId, {
        conversationHistory: convHistRef.current, proctorData: proctorSnapshot(),
      });
      navigate("interview-complete", { interviewId, completedInterview: result.interview });
    } catch (e) { setError(e.message); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Loading guard ─────────────────────────────────────────────────────
  if (loadingPage) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg-0)" }}>
      <div className="spinner spinner-lg" style={{ margin:"0 auto" }} />
    </div>
  );

  if (error && appPhase === "permissions") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg-0)" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:"0 24px" }}>
        <div className="alert alert-error"><span>⚠</span>{error}</div>
        <button className="btn btn-ghost" onClick={() => navigate("candidate-dashboard")}>← Back</button>
      </div>
    </div>
  );

  const timerClass = timeLeft < 300 ? "danger" : timeLeft < 600 ? "warning" : "";
  const tabsLeft   = TAB_SWITCH_LIMIT - (proctorState.tabSwitches || 0);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: permissions
  // ═══════════════════════════════════════════════════════════════════════
  if (appPhase === "permissions") {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--bg-0)", position:"relative" }}>
        <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
        <div className="container-sm" style={{ position:"relative", zIndex:1, padding:"0 24px" }}>
          <div className="card card-pad-lg animate-scaleIn" style={{ maxWidth:500, margin:"0 auto", textAlign:"center" }}>
            <span className="badge badge-purple" style={{ marginBottom:20, display:"inline-flex" }}>
              🎙️ Virtual Interview · {interview?.jobRole || "Loading…"}
            </span>
            <PermissionGate requireMic={true} onGranted={onPermGranted} onDenied={() => {}} />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: ready (rules + start button)
  // ═══════════════════════════════════════════════════════════════════════
  if (appPhase === "ready") {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--bg-0)", position:"relative" }}>
        <div className="bg-grid" /><div className="bg-orb bg-orb-1" />
        <div className="container-sm" style={{ position:"relative", zIndex:1, padding:"0 24px" }}>
          <div className="card card-pad-lg animate-scaleIn" style={{ textAlign:"center" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"var(--green-dim)", border:"2px solid rgba(0,255,178,.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 20px" }}>✅</div>
            <h1 style={{ fontSize:26, fontWeight:800, marginBottom:8 }}>{interview?.jobRole}</h1>
            <p style={{ color:"var(--text-2)", fontSize:14, marginBottom:28, fontFamily:"var(--font-m)" }}>
              AI Conversation · {interview?.questions?.length}Q · {interview?.durationMinutes}min · {interview?.difficulty}
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:28 }}>
              {[
                { icon:"🤖", label:"Adaptive AI",   sub:"Questions evolve with you" },
                { icon:"🎙️", label:"Voice Input",   sub:"Click mic to speak your answer" },
                { icon:"📷", label:"Camera Active", sub:"Face detection running" },
              ].map((item) => (
                <div key={item.label} style={{ padding:"14px 10px", background:"var(--bg-2)", borderRadius:"var(--radius-md)", border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>{item.icon}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:"var(--text-0)", marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:10, fontFamily:"var(--font-m)", color:"var(--text-2)" }}>{item.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign:"left", marginBottom:20, padding:"14px 16px", background:"var(--red-dim)", border:"1px solid rgba(255,77,106,.25)", borderRadius:"var(--radius-md)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--red)", marginBottom:8, fontFamily:"var(--font-m)", textTransform:"uppercase", letterSpacing:"0.08em" }}>⚠ Proctoring Rules</div>
              {["Face must remain visible at all times", "Looking away >5 seconds terminates the test", `Tab switching: you get ${TAB_SWITCH_LIMIT} warnings — 3rd terminates`, "Only answered questions count toward your score"].map((rule, i) => (
                <div key={i} style={{ display:"flex", gap:8, fontSize:13, color:"var(--text-1)", marginBottom:i < 3 ? 5 : 0 }}>
                  <span style={{ color:"var(--red)", flexShrink:0, fontFamily:"var(--font-m)", fontSize:11 }}>{String(i+1).padStart(2,"0")}</span>{rule}
                </div>
              ))}
            </div>
            <div className="alert alert-info" style={{ marginBottom:20, textAlign:"left" }}>
              <span>💡</span>
              <span>Press <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for newline · Click <strong>🎙️ Voice</strong> to dictate</span>
            </div>
            {error && <div className="alert alert-error mb-4"><span>⚠</span>{error}</div>}
            <button className="btn btn-primary btn-xl full-w" onClick={startInterview}>Begin Virtual Interview →</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: active
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ height:"100vh", background:"var(--bg-0)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div className="bg-grid" />

      {termVisible && <TerminationOverlay reason={termReason} saving={termSaving} onExit={() => navigate("candidate-dashboard")} />}

      {/* Tab-switch warning toast */}
      {tabWarn && (
        <div style={{
          position:"fixed", top:80, left:"50%", transform:"translateX(-50%)",
          zIndex:500, padding:"12px 24px", borderRadius:"var(--radius-md)",
          background:"rgba(255,184,48,0.12)", border:"1px solid rgba(255,184,48,0.45)",
          backdropFilter:"blur(14px)", display:"flex", alignItems:"center", gap:12,
          animation:"scaleIn .2s ease", boxShadow:"0 4px 24px rgba(255,184,48,.2)",
        }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--amber)" }}>
              Tab switch warning {tabWarn.count}/{TAB_SWITCH_LIMIT}
            </div>
            <div style={{ fontSize:11, color:"var(--text-2)", fontFamily:"var(--font-m)" }}>
              {tabWarn.remaining > 0 ? `${tabWarn.remaining} more switch${tabWarn.remaining !== 1 ? "es" : ""} will terminate the test` : "One more switch will terminate the test!"}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ position:"relative", zIndex:100, background:"rgba(5,8,16,.95)", backdropFilter:"blur(20px)", borderBottom:"1px solid var(--border)", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--cyan)", animation:"pulse 2s infinite" }} />
          <span style={{ fontFamily:"var(--font-m)", fontSize:12, color:"var(--text-1)", fontWeight:700 }}>VIRTUAL INTERVIEW</span>
          <span className="badge badge-cyan">{interview?.jobRole}</span>
        </div>
        <div className={`timer-display ${timerClass}`}><span>⏱</span>{fmt(timeLeft)}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, fontFamily:"var(--font-m)", color:"var(--text-2)" }}>{currentQIdx}/{interview?.questions?.length}</span>
          {/* Tab counter */}
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background: tabsLeft <= 1 ? "var(--red-dim)" : tabsLeft === 2 ? "var(--amber-dim)" : "var(--bg-2)", border:`1px solid ${tabsLeft <= 1 ? "rgba(255,77,106,.3)" : tabsLeft === 2 ? "rgba(255,184,48,.3)" : "var(--border)"}` }}>
            <span style={{ fontSize:10, fontFamily:"var(--font-m)", fontWeight:700, color: tabsLeft <= 1 ? "var(--red)" : tabsLeft === 2 ? "var(--amber)" : "var(--text-2)" }}>⚠ {tabsLeft} tab{tabsLeft !== 1 ? "s" : ""} left</span>
          </div>
          {/* Face chip */}
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background: proctorState.faceDetected ? "var(--green-dim)" : "var(--red-dim)", border:`1px solid ${proctorState.faceDetected ? "rgba(0,255,178,.2)" : "rgba(255,77,106,.2)"}`, transition:"all .3s" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: proctorState.faceDetected ? "var(--green)" : "var(--red)", animation:"pulse 1.5s infinite" }} />
            <span style={{ fontSize:10, fontFamily:"var(--font-m)", fontWeight:700, color: proctorState.faceDetected ? "var(--green)" : "var(--red)" }}>
              {proctorState.faceDetected ? "FACE OK" : "NO FACE"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height:3, background:"var(--bg-3)", flexShrink:0, position:"relative", zIndex:1 }}>
        <div style={{ height:"100%", width:`${(currentQIdx/(interview?.questions?.length||1))*100}%`, background:"linear-gradient(90deg,var(--cyan-dim),var(--cyan))", transition:"width .8s ease", boxShadow:"0 0 8px var(--cyan)" }} />
      </div>

      {/* Body */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative", zIndex:1 }}>

        {/* Chat column */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Messages */}
          <div ref={chatRef} className="chat-wrap" style={{ flex:1, overflowY:"auto" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role === "candidate" ? "candidate" : ""}`}>
                <div className={`chat-avatar ${msg.role}`}>{msg.role === "ai" ? "🤖" : "👤"}</div>
                <div>
                  <div className="chat-bubble" style={{ whiteSpace:"pre-wrap" }}>{msg.content}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginTop:6, fontFamily:"var(--font-m)", textAlign: msg.role === "candidate" ? "right" : "left" }}>
                    {msg.role === "ai" ? "AI Interviewer" : "You"} · {msg.time}
                  </div>
                </div>
              </div>
            ))}
            {(chatPhase === "loading" || chatPhase === "evaluating") && (
              <div className="chat-msg">
                <div className="chat-avatar ai">🤖</div>
                <div className="chat-bubble" style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {[0,1,2].map((j) => <div key={j} style={{ width:7, height:7, borderRadius:"50%", background:"var(--cyan)", animation:`pulse 1.2s ease ${j*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Input zone */}
          <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border)", background:"rgba(9,13,26,.95)", flexShrink:0 }}>
            {error && <div className="alert alert-error" style={{ marginBottom:8, padding:"8px 12px", fontSize:12 }}><span>⚠</span>{error}</div>}

            {/* Interim transcript preview */}
            {voiceRecording && interimText && (
              <div style={{ marginBottom:8, padding:"7px 12px", background:"rgba(0,229,255,.05)", border:"1px solid rgba(0,229,255,.18)", borderRadius:"var(--radius-sm)", display:"flex", gap:8, alignItems:"flex-start" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--red)", animation:"pulse .8s infinite", flexShrink:0, marginTop:5 }} />
                <span style={{ fontSize:12, color:"var(--text-2)", fontStyle:"italic", lineHeight:1.5 }}>{interimText}</span>
              </div>
            )}

            <div style={{ position:"relative" }}>
              <textarea
                ref={textareaRef}
                className="form-textarea"
                style={{
                  minHeight:88, maxHeight:180, resize:"vertical",
                  paddingRight: voiceSupported ? 158 : 100,
                  borderColor: voiceRecording ? "rgba(239,68,68,.6)" : undefined,
                  boxShadow:   voiceRecording ? "0 0 0 3px rgba(239,68,68,.12)" : undefined,
                  transition:  "border-color .3s, box-shadow .3s",
                }}
                placeholder={
                  voiceRecording        ? "🎙️ Listening… speak your answer"
                  : chatPhase === "answering" ? "Type your answer… (Enter to send, 🎙️ Voice to speak)"
                  : chatPhase === "done"      ? "Interview complete"
                  : "Waiting for next question…"
                }
                value={inputText}
                onChange={(e) => { if (!voiceRecording) setInputText(e.target.value); }}
                onKeyDown={handleKeyDown}
                disabled={chatPhase !== "answering"}
              />

              <div style={{ position:"absolute", bottom:10, right:10, display:"flex", gap:6, alignItems:"center" }}>
                {/* 🎙️ Voice button */}
                {voiceSupported && (
                  <button
                    onClick={handleVoiceToggle}
                    disabled={chatPhase !== "answering"}
                    title={voiceRecording ? "Stop recording" : "Start voice input"}
                    style={{
                      display:"flex", alignItems:"center", gap:5, padding:"6px 11px",
                      borderRadius:"var(--radius-sm)",
                      border:`1px solid ${voiceRecording ? "rgba(239,68,68,.5)" : "var(--border)"}`,
                      background: voiceRecording ? "rgba(239,68,68,.14)" : "var(--bg-3)",
                      color: voiceRecording ? "#ef4444" : "var(--text-1)",
                      fontSize:11, fontWeight:700, fontFamily:"var(--font-m)",
                      cursor: chatPhase !== "answering" ? "not-allowed" : "pointer",
                      opacity: chatPhase !== "answering" ? .4 : 1,
                      transition:"all .2s", whiteSpace:"nowrap",
                    }}
                  >
                    {voiceRecording ? (
                      <>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444", animation:"pulse .8s infinite" }} />
                        Stop
                      </>
                    ) : (
                      <><span style={{ fontSize:13 }}>🎙️</span>Voice</>
                    )}
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!inputText.trim() || chatPhase !== "answering" || voiceRecording}>
                  Send ↵
                </button>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
              <div style={{ fontSize:11, fontFamily:"var(--font-m)", color:"var(--text-3)" }}>
                {voiceRecording
                  ? <span style={{ color:"#ef4444" }}>● Recording — click Stop when done</span>
                  : inputText.length > 0 ? `${inputText.length} chars`
                  : voiceSupported ? "Type or click 🎙️ Voice to speak"
                  : "Be specific — use examples and technical terms"}
              </div>
              {inputText.length > 0 && !voiceRecording && (
                <button style={{ fontSize:10, color:"var(--text-3)", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font-m)" }} onClick={() => setInputText("")}>Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ width:234, borderLeft:"1px solid var(--border)", background:"rgba(9,13,26,.85)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <div style={{ padding:16, borderBottom:"1px solid var(--border)" }}>
            <CameraMonitor videoRef={videoRef} canvasRef={canvasRef} proctorState={proctorState} />
          </div>
          <div style={{ padding:16, borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontSize:10, fontFamily:"var(--font-m)", color:"var(--text-2)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Progress</div>
            {(interview?.questions || []).map((q, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0, background: i < currentQIdx ? "var(--green-dim)" : i === currentQIdx ? "var(--cyan-soft)" : "var(--bg-3)", border:`1px solid ${i < currentQIdx ? "rgba(0,255,178,.4)" : i === currentQIdx ? "var(--cyan)" : "var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontFamily:"var(--font-m)", fontWeight:700, color: i < currentQIdx ? "var(--green)" : i === currentQIdx ? "var(--cyan)" : "var(--text-3)" }}>
                  {i < currentQIdx ? "✓" : i + 1}
                </div>
                <span style={{ fontSize:10, fontFamily:"var(--font-m)", color: i === currentQIdx ? "var(--cyan)" : i < currentQIdx ? "var(--text-2)" : "var(--text-3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.topic}</span>
              </div>
            ))}
          </div>
          <div style={{ padding:16 }}>
            <div style={{ fontSize:10, fontFamily:"var(--font-m)", color:"var(--text-2)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Tips</div>
            <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.6 }}>Structure: what → how → when → real example. Use specific metrics where possible.</div>
          </div>
        </div>
      </div>
    </div>
  );
}