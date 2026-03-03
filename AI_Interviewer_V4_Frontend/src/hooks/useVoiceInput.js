/**
 * useVoiceInput — v3 (fully debugged)
 * ─────────────────────────────────────────────────────────────────────────────
 * Root-cause fixes:
 *
 *  1. SR class captured in a ref once on mount — never changes, never stale.
 *  2. buildRec removed as a useCallback dep; uses an inner function instead.
 *  3. startRecording reads inputText from an arg, NOT from a setState closure.
 *  4. onTranscript stored in a ref so the recognition callback is never stale.
 *  5. Auto-restart uses a *new* recognition instance each time to avoid
 *     InvalidStateError on Chrome when calling .start() on a stopped instance.
 *  6. supported flag stable — computed once on mount.
 */

import { useState, useRef, useCallback, useEffect } from "react";

export function useVoiceInput({ onTranscript } = {}) {
  // ── Check support once, stable for lifetime of hook ────────────────────
  const SRClass       = useRef(
    typeof window !== "undefined"
      ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
      : null
  );
  const supported = !!SRClass.current;

  const [recording,   setRecording]   = useState(false);
  const [interimText, setInterimText] = useState("");

  // Stable refs
  const recRef            = useRef(null);
  const committedRef      = useRef("");
  const baseTextRef       = useRef("");
  const shouldRestartRef  = useRef(false);
  const recordingRef      = useRef(false);
  const onTranscriptRef   = useRef(onTranscript);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // Cleanup on unmount
  useEffect(() => () => {
    shouldRestartRef.current = false;
    recordingRef.current     = false;
    try { recRef.current?.abort(); } catch (_) {}
  }, []);

  // ── Build a fresh recognition instance (called on every (re)start) ────
  const buildAndStart = useCallback(() => {
    const SR = SRClass.current;
    if (!SR) return;

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    rec.maxAlternatives = 1;
    recRef.current      = rec;

    rec.onresult = (event) => {
      if (!recordingRef.current) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          committedRef.current = committedRef.current
            ? committedRef.current + " " + t.trim()
            : t.trim();
        } else {
          interim += t;
        }
      }
      setInterimText(interim);

      const full = baseTextRef.current
        ? baseTextRef.current + (committedRef.current ? " " + committedRef.current : "")
        : committedRef.current;

      onTranscriptRef.current?.(full.trim(), interim);
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed") {
        shouldRestartRef.current = false;
        recordingRef.current     = false;
        setRecording(false);
        setInterimText("");
        console.warn("[Voice] Microphone not allowed");
      } else {
        console.warn("[Voice] Error:", e.error);
      }
    };

    rec.onend = () => {
      // If still supposed to be recording → create a FRESH instance and restart
      if (shouldRestartRef.current && recordingRef.current) {
        // tiny delay prevents rapid-fire restart loops in some browsers
        setTimeout(() => {
          if (shouldRestartRef.current && recordingRef.current) buildAndStart();
        }, 100);
      } else {
        setRecording(false);
        setInterimText("");
        recordingRef.current = false;
      }
    };

    try {
      rec.start();
    } catch (e) {
      console.warn("[Voice] start() error:", e.message);
      shouldRestartRef.current = false;
      recordingRef.current     = false;
      setRecording(false);
    }
  }, []); // no deps — uses only refs

  // ── startRecording ────────────────────────────────────────────────────
  const startRecording = useCallback((currentText = "") => {
    if (!SRClass.current || recordingRef.current) return;

    baseTextRef.current      = typeof currentText === "string" ? currentText.trim() : "";
    committedRef.current     = "";
    shouldRestartRef.current = true;
    recordingRef.current     = true;

    setInterimText("");
    setRecording(true);

    buildAndStart();
  }, [buildAndStart]);

  // ── stopRecording ─────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    shouldRestartRef.current = false;
    recordingRef.current     = false;

    try { recRef.current?.stop(); } catch (_) {}
    try { recRef.current?.abort(); } catch (_) {}

    setRecording(false);
    setInterimText("");

    const full = baseTextRef.current
      ? baseTextRef.current + (committedRef.current ? " " + committedRef.current : "")
      : committedRef.current;

    return full.trim();
  }, []);

  return { supported, recording, interimText, startRecording, stopRecording };
}
