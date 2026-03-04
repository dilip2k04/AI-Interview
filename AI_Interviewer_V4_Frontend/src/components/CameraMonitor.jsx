/**
 * CameraMonitor
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the live webcam feed + MediaPipe canvas overlay in a compact panel.
 * Shows:
 *   • Green ring + "FACE DETECTED" when face is present
 *   • Red ring + countdown warning when face disappears
 *   • Tab-switch / look-away counters
 *
 * Props:
 *   videoRef      – from useProctor()
 *   canvasRef     – from useProctor()
 *   proctorState  – { tabSwitches, lookAwayEvents, faceDetected }
 *   compact       – if true, render a smaller card (sidebar use)
 */
import { useEffect, useState, useRef } from "react";

const LOOK_AWAY_THRESHOLD = 5; // seconds — must match hook

export default function CameraMonitor({ videoRef, canvasRef, proctorState, compact = true }) {
  const [lookAwaySeconds, setLookAwaySeconds] = useState(0);
  const timerRef = useRef(null);

  // Count up seconds when face is not detected
  useEffect(() => {
    if (!proctorState.faceDetected) {
      timerRef.current = setInterval(() => {
        setLookAwaySeconds((s) => Math.min(s + 1, LOOK_AWAY_THRESHOLD + 1));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setLookAwaySeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [proctorState.faceDetected]);

  const faceOk        = proctorState.faceDetected;
  const warningLevel  = !faceOk ? Math.min(lookAwaySeconds / LOOK_AWAY_THRESHOLD, 1) : 0;
  const isWarning     = !faceOk && lookAwaySeconds >= 2;
  const isCritical    = !faceOk && lookAwaySeconds >= 4;

  const ringColor = isCritical ? "#ff4d6a" : isWarning ? "#ffb830" : "#00ffb2";
  const ringGlow  = isCritical ? "rgba(255,77,106,0.5)" : isWarning ? "rgba(255,184,48,0.4)" : "rgba(0,255,178,0.3)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{
        fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text-2)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>Proctoring</span>
        <span style={{
          fontSize: 9, padding: "2px 7px", borderRadius: 10,
          background: faceOk ? "var(--green-dim)" : "var(--red-dim)",
          color: faceOk ? "var(--green)" : "var(--red)",
          border: `1px solid ${faceOk ? "rgba(0,255,178,.2)" : "rgba(255,77,106,.2)"}`,
          transition: "all 0.3s",
        }}>
          {faceOk ? "● LIVE" : "● WARNING"}
        </span>
      </div>

      {/* Camera feed */}
      <div style={{
        position: "relative",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        border: `2px solid ${ringColor}`,
        boxShadow: `0 0 12px ${ringGlow}`,
        transition: "border-color 0.3s, box-shadow 0.3s",
        aspectRatio: "4/3",
        background: "var(--bg-3)",
      }}>
        {/* Actual video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)", // mirror
            display: "block",
          }}
        />

        {/* MediaPipe overlay canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            transform: "scaleX(-1)",
            pointerEvents: "none",
          }}
        />

        {/* Look-away warning bar */}
        {!faceOk && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: 4, background: "var(--bg-3)",
          }}>
            <div style={{
              height: "100%",
              width: `${warningLevel * 100}%`,
              background: isCritical
                ? "linear-gradient(90deg,#cc3353,#ff4d6a)"
                : "linear-gradient(90deg,#cc8f00,#ffb830)",
              transition: "width 0.9s linear, background 0.3s",
              boxShadow: isCritical ? "0 0 6px #ff4d6a" : "0 0 6px #ffb830",
            }} />
          </div>
        )}

        {/* Face-away overlay */}
        {!faceOk && (
          <div style={{
            position: "absolute", inset: 0,
            background: isCritical
              ? "rgba(255,77,106,0.18)"
              : "rgba(255,184,48,0.10)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            transition: "background 0.3s",
          }}>
            <div style={{ fontSize: isCritical ? 22 : 18, marginBottom: 4 }}>
              {isCritical ? "⛔" : "⚠️"}
            </div>
            <div style={{
              fontSize: 10, fontFamily: "var(--font-m)", fontWeight: 700,
              color: isCritical ? "#ff4d6a" : "#ffb830",
              textAlign: "center", letterSpacing: "0.05em",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}>
              {isCritical ? "FACE NOT VISIBLE" : "LOOK AT SCREEN"}
            </div>
            {lookAwaySeconds > 0 && (
              <div style={{
                fontSize: 11, fontFamily: "var(--font-m)",
                color: isCritical ? "#ff4d6a" : "#ffb830",
                marginTop: 3, fontWeight: 700,
              }}>
                {Math.max(0, LOOK_AWAY_THRESHOLD - lookAwaySeconds)}s remaining
              </div>
            )}
          </div>
        )}

        {/* REC badge */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          display: "flex", alignItems: "center", gap: 4,
          padding: "2px 7px", borderRadius: 10,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: faceOk ? "var(--green)" : "var(--red)",
            animation: "pulse 1.5s infinite",
          }} />
          <span style={{ fontSize: 8, fontFamily: "var(--font-m)", color: faceOk ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
            {faceOk ? "FACE OK" : "NO FACE"}
          </span>
        </div>
      </div>

      {/* Integrity panel */}
      <div style={{
        padding: "10px 12px",
        background: "var(--bg-2)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text-2)", marginBottom: 6 }}>INTEGRITY</div>
        <div style={{
          fontSize: 17, fontWeight: 800,
          color: proctorState.tabSwitches > 0 || proctorState.lookAwayEvents > 0 ? "var(--amber)" : "var(--green)",
          marginBottom: 6,
        }}>
          {proctorState.tabSwitches > 0 || proctorState.lookAwayEvents > 0 ? "AT RISK" : "SECURE"}
        </div>
        <div className="progress-bar-wrap">
          <div
            className="progress-bar-fill green"
            style={{ width: proctorState.tabSwitches === 0 && proctorState.lookAwayEvents === 0 ? "100%" : "30%" }}
          />
        </div>
      </div>

      {/* Event counters */}
      <div style={{
        fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text-3)",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tab switches</span>
          <span style={{ color: proctorState.tabSwitches > 0 ? "var(--red)" : "var(--text-2)" }}>
            {proctorState.tabSwitches}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Look-away events</span>
          <span style={{ color: proctorState.lookAwayEvents > 0 ? "var(--amber)" : "var(--text-2)" }}>
            {proctorState.lookAwayEvents}
          </span>
        </div>
      </div>

      {/* Live warning message */}
      {!faceOk && lookAwaySeconds >= 2 && (
        <div style={{
          padding: "8px 10px",
          background: isCritical ? "var(--red-dim)" : "var(--amber-dim)",
          border: `1px solid ${isCritical ? "rgba(255,77,106,.3)" : "rgba(255,184,48,.3)"}`,
          borderRadius: "var(--radius-sm)",
          fontSize: 11,
          color: isCritical ? "var(--red)" : "var(--amber)",
          fontFamily: "var(--font-m)",
          textAlign: "center",
          lineHeight: 1.5,
          animation: "timerPulse 0.8s infinite",
        }}>
          {isCritical
            ? `⛔ TERMINATING IN ${Math.max(0, LOOK_AWAY_THRESHOLD - lookAwaySeconds)}s`
            : `⚠ Look at screen! ${Math.max(0, LOOK_AWAY_THRESHOLD - lookAwaySeconds)}s left`}
        </div>
      )}
    </div>
  );
}