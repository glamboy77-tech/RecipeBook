import test from "node:test";
import assert from "node:assert/strict";
import { createTimerState, formatCountdown, formatTimerDuration, remainingMilliseconds, timerReducer } from "../src/lib/timers.js";

const timer = (id = "first", durationSec = 600) => ({ id, recipeId: "stew", recipeTitle: "찌개", stepIndex: 0, durationSec });
const start = (state, item, now) => timerReducer(state, { type: "start", timer: item, now });
const act = (state, type, now, id = "first") => timerReducer(state, { type, id, now });

test("concurrent timers keep independent absolute deadlines", () => {
  let state = start(createTimerState([], 1000), timer(), 1000);
  state = start(state, timer("second", 300), 11000);
  state = act(state, "tick", 31000);
  assert.equal(remainingMilliseconds(state.timers[0], state.now), 570000);
  assert.equal(remainingMilliseconds(state.timers[1], state.now), 280000);
  assert.equal(start(state, timer(), 31000).timers.length, 2);
});

test("pause and resume preserve partial seconds and do not affect other timers", () => {
  let state = start(createTimerState([], 1000), timer(), 1000);
  state = start(state, timer("second"), 1000);
  state = act(state, "toggle", 2345);
  assert.equal(state.timers[0].status, "paused");
  assert.equal(state.timers[0].remainingMs, 598655);
  state = act(state, "toggle", 10000);
  assert.equal(state.timers[0].endsAt, 608655);
  assert.equal(state.timers[1].endsAt, 601000);
});

test("late ticks complete once and never produce negative remaining time", () => {
  let state = start(createTimerState([], 1000), timer(), 1000);
  state = act(state, "tick", 901000);
  assert.equal(state.timers[0].status, "done");
  assert.equal(remainingMilliseconds(state.timers[0], state.now), 0);
  const completedTimers = state.timers;
  state = act(state, "tick", 902000);
  assert.equal(state.timers, completedTimers);
});

test("reset stops the countdown; done timers can restart; dismiss removes only one timer", () => {
  let state = start(createTimerState([], 1000), timer(), 1000);
  state = start(state, timer("second"), 1000);
  state = act(state, "reset", 2000);
  assert.equal(state.timers[0].status, "ready");
  assert.equal(state.timers[0].remainingMs, 600000);
  state = act(state, "toggle", 3000);
  assert.equal(state.timers[0].endsAt, 603000);
  state = act(state, "tick", 700000);
  state = act(state, "toggle", 701000);
  assert.equal(state.timers[0].status, "running");
  assert.equal(state.timers[0].endsAt, 1301000);
  state = act(state, "dismiss", 701000);
  assert.deepEqual(state.timers.map((t) => t.id), ["second"]);
});

test("restoration retains deadlines, completes expired timers, and rejects corrupt storage", () => {
  let original = start(createTimerState([], 1000), timer(), 1000);
  original = start(original, timer("second", 10), 1000);
  const saved = JSON.parse(JSON.stringify(original.timers));
  const restored = createTimerState([...saved, null, { ...saved[0], durationSec: -1 }, { ...saved[0], endsAt: null }], 31000);
  assert.equal(restored.timers.length, 2);
  assert.equal(remainingMilliseconds(restored.timers[0], restored.now), 570000);
  assert.equal(restored.timers[1].status, "done");
  assert.deepEqual(createTimerState("broken", 31000).timers, []);
});

test("countdown and duration labels support seconds, minutes and hours", () => {
  assert.equal(formatCountdown(1), "00:01");
  assert.equal(formatCountdown(599001), "10:00");
  assert.equal(formatCountdown(-500), "00:00");
  assert.equal(formatCountdown(3661000), "1:01:01");
  assert.equal(formatTimerDuration(150), "2분 30초");
  assert.equal(formatTimerDuration(4200), "1시간 10분");
});
