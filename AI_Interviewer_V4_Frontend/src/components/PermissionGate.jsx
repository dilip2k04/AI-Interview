import { useState } from "react";
/**
 * PermissionGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown BEFORE the interview begins. Requests camera (and optionally mic)
 * access and only calls onGranted() once the browser has confirmed the stream.
 *
 * This prevents the proctoring system from firing a tab_switch violation
 * caused by the browser's permission dialog stealing focus.
 *
 * Props:
 *   requireMic   – also request microphone (Virtual mode)
 *   onGranted    – called with the MediaStream once permissions are confirmed
 *   onDenied     – called if user denies
 */
export default function PermissionGate({ requireMic = false, onGranted, onDenied }) {
  const [phase,   setPhase]   = useState("idle"); // idle|requesting|granted|denied|error
  const [errMsg,  setErrMsg]  = useState("");

  const request = async () => {
    setPhase("requesting");
    try {
      const constraints = {
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: requireMic,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPhase("granted");
      // Small delay so the user sees the ✅ state before we proceed
      setTimeout(() => onGranted?.(stream), 600);
    } catch (err) {
      const msg = err.name === "NotAllowedError"
        ? "Camera access was denied. Please allow camera access in your browser settings and try again."
        : err.name === "NotFoundError"
          ? "No camera found. Please connect a camera and try again."
          : `Permission error: ${err.message}`;
      setErrMsg(msg);
      setPhase("denied");
      onDenied?.(err);
    }
  };

  const iconSize = 56;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 0, textAlign: "center",
    }}>
      {/* Icon area */}
      <div style={{
        width: iconSize + 24, height: iconSize + 24, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: iconSize * 0.7,
        background: phase === "granted"
          ? "var(--green-dim)"
          : phase === "denied"
            ? "var(--red-dim)"
            : phase === "requesting"
              ? "var(--cyan-soft)"
              : "var(--bg-2)",
        border: `2px solid ${
          phase === "granted" ? "rgba(0,255,178,.35)"
          : phase === "denied" ? "rgba(255,77,106,.35)"
          : phase === "requesting" ? "rgba(0,229,255,.35)"
          : "var(--border)"}`,
        marginBottom: 20,
        transition: "all 0.4s ease",
        boxShadow: phase === "granted"
          ? "0 0 24px rgba(0,255,178,.2)"
          : phase === "requesting"
            ? "0 0 24px rgba(0,229,255,.15)"
            : "none",
      }}>
        {phase === "granted"
          ? "✅"
          : phase === "denied"
            ? "🚫"
            : phase === "requesting"
              ? "⏳"
              : requireMic ? "🎙️📷" : "📷"}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: "var(--text-0)" }}>
        {phase === "granted"
          ? "Permissions Granted!"
          : phase === "denied"
            ? "Access Denied"
            : phase === "requesting"
              ? "Waiting for permission…"
              : requireMic
                ? "Camera & Microphone Required"
                : "Camera Required"}
      </h3>

      {/* Description */}
      <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 24, maxWidth: 380 }}>
        {phase === "granted"
          ? "All permissions confirmed. Starting your interview now…"
          : phase === "denied"
            ? errMsg
            : phase === "requesting"
              ? "Please click 'Allow' in the browser permission dialog that appeared."
              : requireMic
                ? "This interview requires camera access for face monitoring and microphone access for voice responses. Your video is never recorded or stored."
                : "This interview requires camera access to monitor your presence throughout the session. Your video is never recorded or stored."}
      </p>

      {/* What will be monitored */}
      {phase === "idle" && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 8,
          marginBottom: 28, width: "100%", maxWidth: 360,
        }}>
          {[
            { icon: "👁️", label: "Face presence detection" },
            { icon: "🔒", label: "Video never recorded or stored" },
            requireMic ? { icon: "🎙️", label: "Voice input for your answers" } : null,
            { icon: "⛔", label: "Looking away >5s terminates test" },
          ].filter(Boolean).map((item) => (
            <div key={item.icon} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              background: "var(--bg-2)", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)", fontSize: 13, color: "var(--text-1)",
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {phase === "idle" && (
        <button
          className="btn btn-primary btn-lg"
          onClick={request}
          style={{ minWidth: 220 }}
        >
          Allow {requireMic ? "Camera & Mic" : "Camera"} →
        </button>
      )}

      {phase === "requesting" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--cyan)", fontFamily: "var(--font-m)", fontSize: 13 }}>
          <div className="spinner" />
          Waiting for browser prompt…
        </div>
      )}

      {phase === "denied" && (
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline btn-lg" onClick={request}>Try Again</button>
        </div>
      )}
    </div>
  );
}
