import { useTimers } from "../lib/timerContext";
import { formatCountdown, formatTimerDuration, remainingMilliseconds } from "../lib/timers";
import Icon from "./Icon";

export default function StepTimer({ recipe, stepIndex, seconds }) {
  const { timers, now, startTimer, controlTimer } = useTimers();
  const id = JSON.stringify([recipe.id, stepIndex]);
  const timer = timers.find((t) => t.id === id);
  const duration = formatTimerDuration(seconds);
  const isRunning = timer?.status === "running";
  const label = !timer || timer.status === "ready" ? `${duration} 타이머 시작` : isRunning ? "타이머 일시정지" : timer.status === "done" ? `${duration} 타이머 다시 시작` : "타이머 이어하기";

  function activate() {
    if (timer) controlTimer("toggle", id);
    else startTimer({ id, recipeId: recipe.id, recipeTitle: recipe.title, stepIndex, durationSec: seconds });
  }

  return (
    <button className={`step-time step-timer ${timer ? `timer-${timer.status}` : ""}`} onClick={activate} aria-label={`${stepIndex + 1}단계 ${label}`}>
      <Icon name={isRunning ? "pause" : timer?.status === "done" ? "check" : "clock"} size={14} />
      {timer && timer.status !== "ready" ? <><span className="timer-digits">{formatCountdown(remainingMilliseconds(timer, now))}</span><span>{isRunning ? "진행 중" : timer.status === "done" ? "완료 · 다시 시작" : "일시정지"}</span></> : <><span>{duration}</span><Icon name="play" size={11} /></>}
    </button>
  );
}
