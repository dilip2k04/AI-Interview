/**
 * useProctor v2
 * ──────────────────────────────────────────────────────────────────────────────
 * Changes from v1:
 *  • TAB_SWITCH_LIMIT = 3 — first 2 switches are warnings, 3rd terminates
 *  • Added "permissionsGranted" gate — listeners only arm AFTER the flag is set,
 *    so the camera/mic permission dialog blur doesn't count as a violation
 *  • Warnings surfaced via proctorState.tabSwitchWarning (count before limit)
 */

import { useEffect, useRef, useState, useCallback } from "react";

const LOOK_AWAY_THRESHOLD_MS = 5000;   // ms without face → terminate
const TAB_SWITCH_LIMIT       = 3;      // violations before termination
const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4";
const CAMERA_CDN    = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.crossOrigin = "anonymous";
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function useProctor({ enabled = true, permissionsGranted = true, onTerminate, onTabSwitchWarning }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  const countersRef = useRef({
    tabSwitches:    0,
    lookAwayEvents: 0,
    faceDetected:   true,
    lookAwayStart:  null,
  });

  const [proctorState, setProctorState] = useState({
    tabSwitches:       0,
    tabSwitchesLeft:   TAB_SWITCH_LIMIT,  // warnings remaining before termination
    lookAwayEvents:    0,
    faceDetected:      true,
  });

  const [terminated, setTerminated] = useState(false);
  const [termReason, setTermReason] = useState(null);
  const terminatedRef              = useRef(false);

  const cameraInstanceRef = useRef(null);

  const snapshot = useCallback(() => ({
    tabSwitches:       countersRef.current.tabSwitches,
    lookAwayEvents:    countersRef.current.lookAwayEvents,
    fullscreenExits:   0,
    longPauses:        0,
    cameraDisconnects: 0,
  }), []);

  // ── Central termination ───────────────────────────────────────────────────
  const terminate = useCallback((reason) => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;
    try { cameraInstanceRef.current?.stop(); } catch (_) {}
    try {
      const stream = videoRef.current?.srcObject;
      stream?.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    setTerminated(true);
    setTermReason(reason);
    onTerminate?.(reason);
  }, [onTerminate]);

  // ── 1. TAB-SWITCH DETECTOR ───────────────────────────────────────────────
  // Only activates once both enabled AND permissionsGranted are true.
  useEffect(() => {
    if (!enabled || !permissionsGranted) return;

    const onHidden = () => {
      if (terminatedRef.current) return;
      // Only count when document actually hides (tab switch / minimize)
      if (document.hidden) {
        countersRef.current.tabSwitches++;
        const count = countersRef.current.tabSwitches;
        const remaining = TAB_SWITCH_LIMIT - count;

        setProctorState((p) => ({
          ...p,
          tabSwitches:     count,
          tabSwitchesLeft: Math.max(0, remaining),
        }));

        if (count >= TAB_SWITCH_LIMIT) {
          terminate("tab_switch");
        } else {
          // Issue a warning (non-terminating)
          onTabSwitchWarning?.(count, remaining);
        }
      }
    };

    const onBlur = () => {
      if (terminatedRef.current) return;
      // window blur: only count if document is also hidden
      // (avoids counting devtools open, permission dialogs, etc.)
      setTimeout(() => {
        if (document.hidden) onHidden();
      }, 100);
    };

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, permissionsGranted, terminate, onTabSwitchWarning]);

  // ── 2. MEDIAPIPE FACE DETECTION ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !permissionsGranted) return;
    let alive = true;

    async function init() {
      try {
        await loadScript(`${MEDIAPIPE_CDN}/face_detection.js`);
        await loadScript(`${CAMERA_CDN}/camera_utils.js`);
        if (!alive || terminatedRef.current) return;

        const FaceDetection = window.FaceDetection;
        const Camera        = window.Camera;
        if (!FaceDetection || !Camera) {
          console.warn("[Proctor] MediaPipe unavailable, face detection skipped");
          return;
        }

        const fd = new FaceDetection({
          locateFile: (f) => `${MEDIAPIPE_CDN}/${f}`,
        });
        fd.setOptions({ model: "short", minDetectionConfidence: 0.6 });

        fd.onResults((results) => {
          if (!alive || terminatedRef.current) return;
          const now = Date.now();
          const facePresent = (results.detections?.length || 0) > 0;

          // ── Draw overlay ────────────────────────────────────────────────
          const canvas = canvasRef.current;
          const video  = videoRef.current;
          if (canvas && video) {
            const ctx = canvas.getContext("2d");
            canvas.width  = video.videoWidth  || 320;
            canvas.height = video.videoHeight || 240;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (facePresent) {
              const d   = results.detections[0];
              const box = d.boundingBox;
              const w   = canvas.width, h = canvas.height;
              const x   = box.xCenter * w - (box.width  * w) / 2;
              const y   = box.yCenter * h - (box.height * h) / 2;
              const bw  = box.width * w, bh = box.height * h;
              ctx.strokeStyle = "#00e5ff";
              ctx.lineWidth   = 2;
              ctx.shadowColor = "#00e5ff";
              ctx.shadowBlur  = 8;
              ctx.strokeRect(x, y, bw, bh);
              const tick = 12;
              ctx.lineWidth = 3;
              [[x,y],[x+bw,y],[x,y+bh],[x+bw,y+bh]].forEach(([cx,cy], i) => {
                ctx.beginPath();
                ctx.moveTo(cx + (i%2===0 ? tick : -tick), cy);
                ctx.lineTo(cx, cy);
                ctx.lineTo(cx, cy + (i<2 ? tick : -tick));
                ctx.stroke();
              });
              ctx.shadowBlur = 0;
            }
          }

          // ── Look-away logic ─────────────────────────────────────────────
          const c = countersRef.current;
          if (!facePresent) {
            if (c.faceDetected) {
              c.lookAwayStart = now;
              c.faceDetected  = false;
              setProctorState((p) => ({ ...p, faceDetected: false }));
            } else {
              const elapsed = now - (c.lookAwayStart || now);
              if (elapsed >= LOOK_AWAY_THRESHOLD_MS) {
                c.lookAwayEvents++;
                setProctorState((p) => ({ ...p, lookAwayEvents: c.lookAwayEvents, faceDetected: false }));
                terminate("look_away");
              }
            }
          } else {
            if (!c.faceDetected) {
              c.faceDetected  = true;
              c.lookAwayStart = null;
              setProctorState((p) => ({ ...p, faceDetected: true }));
            }
          }
        });

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (!alive || terminatedRef.current) return;
            await fd.send({ image: videoRef.current });
          },
          width: 320, height: 240, facingMode: "user",
        });
        cameraInstanceRef.current = camera;
        await camera.start();
      } catch (err) {
        console.warn("[Proctor] Face detection error:", err.message);
      }
    }
    init();
    return () => {
      alive = false;
      try { cameraInstanceRef.current?.stop(); } catch (_) {}
    };
  }, [enabled, permissionsGranted, terminate]);

  return { videoRef, canvasRef, proctorState, terminated, termReason, snapshot };
}
