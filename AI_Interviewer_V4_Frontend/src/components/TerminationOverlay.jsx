import { useEffect, useState } from "react";

const CONFIG = {
  look_away: {
    icon:     "👁️",
    title:    "Interview Terminated",
    subtitle: "Face not detected for 5 seconds",
    detail:   "Our proctoring system detected that you looked away from the screen for more than 5 seconds. This is a violation of the interview policy.",
    color:    "#ff4d6a",
    glow:     "rgba(255,77,106,0.25)",
    border:   "rgba(255,77,106,0.4)",
    label:    "LOOK-AWAY VIOLATION",
  },
  tab_switch: {
    icon:     "🚫",
    title:    "Interview Terminated",
    subtitle: "Tab switch or window focus loss detected",
    detail:   "You switched browser tabs or left the interview window. This is a zero-tolerance proctoring violation. The test has been automatically ended.",
    color:    "#ff4d6a",
    glow:     "rgba(255,77,106,0.25)",
    border:   "rgba(255,77,106,0.4)",
    label:    "TAB-SWITCH VIOLATION",
  },
};

export default function TerminationOverlay({ reason, saving, onExit }) {
  const [countdown, setCountdown] = useState(8);
  const cfg = CONFIG[reason] || CONFIG["look_away"];

  // Auto-redirect countdown once saving is complete
  useEffect(() => {
    if (saving) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); onExit?.(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [saving, onExit]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,8,16,0.97)",
      backdropFilter: "blur(16px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.3s ease",
    }}>
      {/* Pulsing radial background */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% 50%, ${cfg.glow} 0%, transparent 65%)`,
        animation: "termPulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Top scanner line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
        animation: "scanline 1.5s linear infinite",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 540, width: "100%", padding: "0 24px",
        textAlign: "center",
        animation: "scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Violation badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 20,
          background: "rgba(255,77,106,0.12)",
          border: `1px solid ${cfg.border}`,
          marginBottom: 28,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, animation: "pulse 1s infinite" }} />
          <span style={{ fontSize: 10, fontFamily: "var(--font-m)", color: cfg.color, letterSpacing: "0.15em", fontWeight: 700 }}>
            {cfg.label}
          </span>
        </div>

        {/* Icon */}
        <div style={{
          fontSize: 72, marginBottom: 20, lineHeight: 1,
          filter: `drop-shadow(0 0 24px ${cfg.color})`,
          animation: "iconShake 0.5s ease 0.2s",
        }}>
          {cfg.icon}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 32, fontWeight: 800, color: "var(--text-0)",
          letterSpacing: "-0.03em", marginBottom: 10,
          fontFamily: "var(--font-d)",
        }}>
          {cfg.title}
        </h1>

        <p style={{
          fontSize: 16, color: cfg.color, fontWeight: 700,
          marginBottom: 16, fontFamily: "var(--font-d)",
        }}>
          {cfg.subtitle}
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${cfg.border},transparent)`, marginBottom: 20 }} />

        {/* Detail */}
        <p style={{
          fontSize: 14, color: "var(--text-1)", lineHeight: 1.7,
          marginBottom: 28,
        }}>
          {cfg.detail}
        </p>

        {/* What was saved */}
        <div style={{
          padding: "16px 20px",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          marginBottom: 28,
        }}>
          {saving ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              <div className="spinner" style={{ borderTopColor: cfg.color }} />
              <span style={{ fontSize: 13, color: "var(--text-1)", fontFamily: "var(--font-m)" }}>
                Saving partial results to database…
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--green)", fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 13, color: "var(--text-1)" }}>
                  Your completed answers have been saved and scored
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--amber)", fontSize: 14 }}>⚠</span>
                <span style={{ fontSize: 13, color: "var(--text-1)" }}>
                  Unanswered questions are counted as incorrect
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: cfg.color, fontSize: 14 }}>✗</span>
                <span style={{ fontSize: 13, color: "var(--text-1)" }}>
                  This session has been flagged as a proctoring violation
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Auto-exit countdown */}
        {!saving && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontFamily: "var(--font-m)", color: "var(--text-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Redirecting in
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 52, borderRadius: "50%",
              background: "var(--bg-2)", border: `2px solid ${cfg.color}`,
              fontSize: 22, fontWeight: 800, color: cfg.color,
              fontFamily: "var(--font-m)",
              boxShadow: `0 0 16px ${cfg.glow}`,
            }}>
              {countdown}
            </div>
          </div>
        )}

        <button
          onClick={onExit}
          disabled={saving}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 32px", borderRadius: "var(--radius-sm)",
            background: saving ? "var(--bg-3)" : cfg.color,
            color: saving ? "var(--text-2)" : "#050810",
            border: "none", cursor: saving ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 700, fontFamily: "var(--font-d)",
            opacity: saving ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {saving ? "Saving…" : "Exit to Dashboard"}
        </button>
      </div>

      <style>{`
        @keyframes termPulse {
          0%,100% { opacity:0.6; transform:scale(1); }
          50%      { opacity:1;   transform:scale(1.05); }
        }
        @keyframes scanline {
          0%   { transform:translateX(-100%); }
          100% { transform:translateX(100vw); }
        }
        @keyframes iconShake {
          0%,100% { transform:translateX(0) rotate(0deg); }
          20%     { transform:translateX(-8px) rotate(-4deg); }
          40%     { transform:translateX(8px)  rotate(4deg); }
          60%     { transform:translateX(-6px) rotate(-2deg); }
          80%     { transform:translateX(6px)  rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
