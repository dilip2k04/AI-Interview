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
  const [videoStatus, setVideoStatus] = useState("loading"); // loading | loaded | playing | ended | error | no-stream | reviving
  const [revivalCount, setRevivalCount] = useState(0);
  const timerRef = useRef(null);
  const originalStreamRef = useRef(null); // store original stream to re-attach

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

  // Monitor video playback & revive track when ended
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Store original stream on first load
    if (video.srcObject && !originalStreamRef.current) {
      originalStreamRef.current = video.srcObject;
      console.log("[CameraMonitor] Stored original stream for revival");
    }

    const handleLoadedMetadata = () => {
      console.log("[CameraMonitor] Video metadata loaded");
      setVideoStatus("loaded");
      video.play().catch(e => console.warn("[CameraMonitor] Play after metadata failed:", e));
    };

    const handleCanPlay = () => {
      console.log("[CameraMonitor] Video can play → should be rendering frames");
      setVideoStatus("playing");
    };

    const handlePlay = () => {
      console.log("[CameraMonitor] Video started playing");
      setVideoStatus("playing");
    };

    const handleEnded = () => {
      console.log("[CameraMonitor] VIDEO TRACK ENDED — revival attempt #" + (revivalCount + 1));
      setVideoStatus("ended");
      setRevivalCount(prev => prev + 1);
    };

    const handleError = (e) => {
      console.error("[CameraMonitor] Video playback error:", e);
      setVideoStatus("error");
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    // Health check + revival
    const healthInterval = setInterval(() => {
      if (!video.srcObject && originalStreamRef.current) {
        console.log("[CameraMonitor] srcObject lost → re-attaching original stream");
        video.srcObject = originalStreamRef.current;
        video.load();
        video.play().catch(e => console.warn("[CameraMonitor] Re-attach play failed:", e));
        setVideoStatus("reviving");
        return;
      }

      const track = video.srcObject?.getVideoTracks()[0];
      if (!track) {
        console.warn("[CameraMonitor] No video track in stream");
        setVideoStatus("no-stream");
        return;
      }

      console.log("[CameraMonitor] Video track health:", {
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label || "(unknown)",
      });

      // Revival logic
      if (track.readyState === "ended" || !track.enabled) {
        console.log("[CameraMonitor] Track ended/disabled → revival attempt #" + (revivalCount + 1));
        setVideoStatus("reviving");

        track.enabled = true;

        // Aggressive revival sequence
        video.pause();
        video.srcObject = null;

        setTimeout(() => {
          if (videoRef.current && originalStreamRef.current) {
            videoRef.current.srcObject = originalStreamRef.current;
            videoRef.current.load();
            videoRef.current.play().catch(e => {
              console.warn("[CameraMonitor] Revival play failed:", e);
              setVideoStatus("error");
            });
          }
        }, 500);

        setRevivalCount(prev => prev + 1);
      }
    }, 2000);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      clearInterval(healthInterval);
    };
  }, [videoRef, revivalCount]);

  const faceOk = proctorState.faceDetected;
  const warningLevel = !faceOk ? Math.min(lookAwaySeconds / LOOK_AWAY_THRESHOLD, 1) : 0;
  const isWarning = !faceOk && lookAwaySeconds >= 2;
  const isCritical = !faceOk && lookAwaySeconds >= 4;

  const ringColor = isCritical ? "#ff4d6a" : isWarning ? "#ffb830" : "#00ffb2";
  const ringGlow = isCritical ? "rgba(255,77,106,0.5)" : isWarning ? "rgba(255,184,48,0.4)" : "rgba(0,255,178,0.3)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--font-m)",
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Proctoring</span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 7px",
            borderRadius: 10,
            background: faceOk ? "var(--green-dim)" : "var(--red-dim)",
            color: faceOk ? "var(--green)" : "var(--red)",
            border: `1px solid ${faceOk ? "rgba(0,255,178,.2)" : "rgba(255,77,106,.2)"}`,
            transition: "all 0.3s",
          }}
        >
          {faceOk ? "● LIVE" : "● WARNING"}
        </span>
      </div>

      {/* Camera feed container */}
      <div
        style={{
          position: "relative",
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          border: `2px solid ${ringColor}`,
          boxShadow: `0 0 12px ${ringGlow}`,
          transition: "border-color 0.3s, box-shadow 0.3s",
          aspectRatio: "4/3",
          background: "var(--bg-3)",
        }}
      >
        {/* Live video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)", // mirror
            display: "block",
            background: "#000",
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* 
          IMPORTANT DIAGNOSTIC TEST (do this now):
          Comment out the next line (canvas) and reload the app.
          If your live face appears in the sidebar → MediaPipe is ending/hiding the video track.
          Then the fix must be made in useProctor.js to prevent track.stop() or srcObject = null.
        */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Status overlay */}
        {videoStatus !== "playing" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontFamily: "var(--font-m)",
              textAlign: "center",
              padding: 12,
              zIndex: 5,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              {videoStatus === "loading" && "Starting camera..."}
              {videoStatus === "loaded" && "Camera connected"}
              {videoStatus === "playing" && "Live feed active"}
              {videoStatus === "ended" && `Feed ended (MediaPipe) - Revival attempts: ${revivalCount}`}
              {videoStatus === "reviving" && `Reviving camera... attempt #${revivalCount}`}
              {videoStatus === "error" && "Camera error – check console"}
              {videoStatus === "no-stream" && "No camera stream"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              Status: {videoStatus} {revivalCount > 0 && `(Revived ${revivalCount}×)`}
            </div>
          </div>
        )}

        {/* Look-away warning bar */}
        {!faceOk && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "var(--bg-3)",
              zIndex: 3,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${warningLevel * 100}%`,
                background: isCritical
                  ? "linear-gradient(90deg,#cc3353,#ff4d6a)"
                  : "linear-gradient(90deg,#cc8f00,#ffb830)",
                transition: "width 0.9s linear, background 0.3s",
                boxShadow: isCritical ? "0 0 6px #ff4d6a" : "0 0 6px #ffb830",
              }}
            />
          </div>
        )}

        {/* Face-away overlay */}
        {!faceOk && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: isCritical
                ? "rgba(255,77,106,0.18)"
                : "rgba(255,184,48,0.10)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.3s",
              zIndex: 4,
            }}
          >
            <div style={{ fontSize: isCritical ? 22 : 18, marginBottom: 4 }}>
              {isCritical ? "⛔" : "⚠️"}
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-m)",
                fontWeight: 700,
                color: isCritical ? "#ff4d6a" : "#ffb830",
                textAlign: "center",
                letterSpacing: "0.05em",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}
            >
              {isCritical ? "FACE NOT VISIBLE" : "LOOK AT SCREEN"}
            </div>
            {lookAwaySeconds > 0 && (
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-m)",
                  color: isCritical ? "#ff4d6a" : "#ffb830",
                  marginTop: 3,
                  fontWeight: 700,
                }}
              >
                {Math.max(0, LOOK_AWAY_THRESHOLD - lookAwaySeconds)}s remaining
              </div>
            )}
          </div>
        )}

        {/* REC badge */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 7px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 6,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: faceOk ? "var(--green)" : "var(--red)",
              animation: "pulse 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: 8,
              fontFamily: "var(--font-m)",
              color: faceOk ? "var(--green)" : "var(--red)",
              fontWeight: 700,
            }}
          >
            {faceOk ? "FACE OK" : "NO FACE"}
          </span>
        </div>
      </div>

      {/* Integrity panel */}
      <div
        style={{
          padding: "10px 12px",
          background: "var(--bg-2)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 10, fontFamily: "var(--font-m)", color: "var(--text-2)", marginBottom: 6 }}>
          INTEGRITY
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: proctorState.tabSwitches > 0 || proctorState.lookAwayEvents > 0 ? "var(--amber)" : "var(--green)",
            marginBottom: 6,
          }}
        >
          {proctorState.tabSwitches > 0 || proctorState.lookAwayEvents > 0 ? "AT RISK" : "SECURE"}
        </div>
        <div className="progress-bar-wrap">
          <div
            className="progress-bar-fill green"
            style={{
              width: proctorState.tabSwitches === 0 && proctorState.lookAwayEvents === 0 ? "100%" : "30%",
            }}
          />
        </div>
      </div>

      {/* Event counters */}
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--font-m)",
          color: "var(--text-3)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
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
        <div
          style={{
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
          }}
        >
          {isCritical
            ? `⛔ TERMINATING IN ${Math.max(0, LOOK_AWAY_THRESHOLD - lookAwaySeconds)}s`
            : `⚠ Look at screen! ${Math.max(0, LOOK_AWAY_THRESHOLD - lookAwaySeconds)}s left`}
        </div>
      )}
    </div>
  );
}