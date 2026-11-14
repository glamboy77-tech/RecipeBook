import { useEffect, useReducer, useRef, useState } from "react";
import { TimerContext } from "../lib/timerContext";
import { createTimerState, timerReducer } from "../lib/timers";

const STORAGE_KEY = "recipebook:cooking-timers:v1";

function restoreTimers() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { /* Storage is optional. */ }
  return createTimerState(saved?.version === 1 ? saved.timers : [], Date.now());
}

export default function TimerProvider({ children }) {
  const [{ timers, now }, dispatch] = useReducer(timerReducer, undefined, restoreTimers);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audio = useRef(null);
  const announced = useRef(new Set());
  const running = timers.some((t) => t.status === "running");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, timers })); } catch { /* Keep working when storage is unavailable. */ }
  }, [timers]);

  useEffect(() => {
    if (!running) return;
    const tick = () => dispatch({ type: "tick", now: Date.now() });
    const interval = window.setInterval(tick, 250);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);

  useEffect(() => {
    const completed = timers.filter((t) => t.status === "done" && !announced.current.has(`${t.id}:${t.endsAt}`));
    if (!completed.length) return;
    completed.forEach((t) => announced.current.add(`${t.id}:${t.endsAt}`));
    const context = audio.current;
    if (!soundEnabled || !context || context.state !== "running") return;
    // A short, generated chime also works offline without an audio download.
    try {
      for (let i = 0; i < 3; i++) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + i * 0.32;
        oscillator.type = "sine";
        oscillator.frequency.value = i === 2 ? 1046.5 : 880;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + 0.25);
      }
    } catch { /* Visual completion still works if audio is unavailable. */ }
  }, [timers, soundEnabled]);

  useEffect(() => () => {
    audio.current?.close().catch(() => {});
    audio.current = null;
  }, []);

  function enableAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audio.current || audio.current.state === "closed") audio.current = new AudioContext();
      if (audio.current.state === "suspended") audio.current.resume().catch(() => {});
    } catch { /* Audio must never block the timer. */ }
  }

  function startTimer(timer) {
    if (soundEnabled) enableAudio();
    dispatch({ type: "start", timer, now: Date.now() });
  }

  function controlTimer(type, id) {
    if (soundEnabled && type === "toggle") enableAudio();
    dispatch({ type, id, now: Date.now() });
  }

  function toggleSound() {
    if (!soundEnabled) enableAudio();
    setSoundEnabled((enabled) => !enabled);
  }

  return <TimerContext.Provider value={{ timers, now, startTimer, controlTimer, soundEnabled, toggleSound }}>{children}</TimerContext.Provider>;
}
