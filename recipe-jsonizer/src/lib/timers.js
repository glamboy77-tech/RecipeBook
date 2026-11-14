// Store deadlines rather than subtracting seconds: background tabs may skip ticks.
export function remainingMilliseconds(timer, now) {
  return Math.max(0, timer.status === "running" ? timer.endsAt - now : timer.remainingMs);
}

export function formatCountdown(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${String(minutes).padStart(2, "0")}:${rest}`;
}

export function formatTimerDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours && `${hours}시간`, minutes && `${minutes}분`, seconds % 60 && `${seconds % 60}초`].filter(Boolean).join(" ");
}

function settleTimers(timers, now) {
  if (!timers.some((t) => t.status === "running" && t.endsAt <= now)) return timers;
  return timers.map((t) => t.status === "running" && t.endsAt <= now ? { ...t, status: "done", remainingMs: 0 } : t);
}

function validSavedTimer(t) {
  return t && typeof t.id === "string" && typeof t.recipeId === "string" && typeof t.recipeTitle === "string"
    && Number.isInteger(t.stepIndex) && t.stepIndex >= 0
    && Number.isInteger(t.durationSec) && t.durationSec > 0
    && Number.isFinite(t.remainingMs) && t.remainingMs >= 0 && t.remainingMs <= t.durationSec * 1000
    && ["ready", "running", "paused", "done"].includes(t.status)
    && (t.status !== "running" || (Number.isFinite(t.endsAt) && t.endsAt > 0));
}

export function createTimerState(saved, now) {
  const valid = Array.isArray(saved) ? saved.filter(validSavedTimer).map((t) => ({
    id: t.id, recipeId: t.recipeId, recipeTitle: t.recipeTitle, stepIndex: t.stepIndex,
    durationSec: t.durationSec, status: t.status, endsAt: t.endsAt,
    remainingMs: t.status === "done" ? 0 : t.remainingMs,
  })) : [];
  return { now, timers: settleTimers([...new Map(valid.map((t) => [t.id, t])).values()], now) };
}

export function timerReducer(state, action) {
  const now = action.now;
  let timers = settleTimers(state.timers, now);
  if (action.type === "start") {
    const { timer } = action;
    if (!timers.some((t) => t.id === timer.id)) {
      timers = [...timers, { ...timer, status: "running", remainingMs: timer.durationSec * 1000, endsAt: now + timer.durationSec * 1000 }];
    }
  } else if (action.type === "dismiss") {
    timers = timers.filter((t) => t.id !== action.id);
  } else if (action.type === "reset" || action.type === "toggle") {
    timers = timers.map((t) => {
      if (t.id !== action.id) return t;
      if (action.type === "reset") return { ...t, status: "ready", remainingMs: t.durationSec * 1000, endsAt: null };
      if (t.status === "running") return { ...t, status: "paused", remainingMs: remainingMilliseconds(t, now), endsAt: null };
      const remainingMs = t.status === "done" ? t.durationSec * 1000 : t.remainingMs;
      return { ...t, status: "running", remainingMs, endsAt: now + remainingMs };
    });
  }
  return { now, timers };
}
