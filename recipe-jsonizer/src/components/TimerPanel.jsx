import { useState } from "react";
import { useTimers } from "../lib/timerContext";
import { formatCountdown, formatTimerDuration, remainingMilliseconds } from "../lib/timers";
import Icon from "./Icon";

export default function TimerPanel() {
  const { timers, now, controlTimer, soundEnabled, toggleSound } = useTimers();
  const [expanded, setExpanded] = useState(true);
  if (!timers.length) return null;
  const completed = timers.filter((t) => t.status === "done").length;
  const running = timers.filter((t) => t.status === "running");
  const next = running.length ? Math.min(...running.map((t) => remainingMilliseconds(t, now))) : null;

  return (
    <section className="timer-panel" aria-label="조리 타이머">
      <div className="timer-panel-header">
        <button className="timer-panel-toggle" aria-expanded={expanded} aria-controls="cooking-timers" onClick={() => setExpanded((open) => !open)}>
          <Icon name="clock" size={17} /><strong>조리 타이머</strong><span className="timer-count">{timers.length}</span>
          <span className="timer-summary">{completed ? `${completed}개 완료` : next !== null ? `다음 완료 ${formatCountdown(next)}` : "잠시 쉬는 중"}</span>
          <Icon name="chevron" size={15} className={expanded ? "chevron-expanded" : ""} />
        </button>
        <button className="timer-sound" aria-label={soundEnabled ? "알림 소리 끄기" : "알림 소리 켜기"} aria-pressed={soundEnabled} onClick={toggleSound}><Icon name={soundEnabled ? "sound" : "muted"} size={17} /></button>
      </div>
      <div id="cooking-timers" className="timer-panel-body" hidden={!expanded}>
        <ul className="active-timers">{timers.map((timer) => {
          const remaining = remainingMilliseconds(timer, now);
          const done = timer.status === "done";
          const label = timer.status === "running" ? "일시정지" : done ? "다시 시작" : "시작";
          return <li key={timer.id} className={`active-timer timer-${timer.status}`}>
            <div className="active-timer-copy"><strong>{timer.recipeTitle}</strong><span>{timer.stepIndex + 1}단계 · {formatTimerDuration(timer.durationSec)}<span className="timer-state" role="status">{done ? "완료!" : timer.status === "paused" ? "일시정지" : timer.status === "ready" ? "대기" : "진행 중"}</span></span></div>
            <output className="timer-digits" role="timer" aria-live="off" aria-label={`${timer.recipeTitle} ${timer.stepIndex + 1}단계 남은 시간`}>{formatCountdown(remaining)}</output>
            <div className="timer-controls">
              <button className="timer-primary-control" aria-label={`${timer.recipeTitle} ${timer.stepIndex + 1}단계 ${label}`} onClick={() => controlTimer("toggle", timer.id)}><Icon name={timer.status === "running" ? "pause" : "play"} size={15} /></button>
              <button aria-label={`${timer.recipeTitle} ${timer.stepIndex + 1}단계 초기화`} onClick={() => controlTimer("reset", timer.id)}><Icon name="reset" size={15} /></button>
              <button aria-label={`${timer.recipeTitle} ${timer.stepIndex + 1}단계 타이머 닫기`} onClick={() => controlTimer("dismiss", timer.id)}><Icon name="close" size={15} /></button>
            </div>
          </li>;
        })}</ul>
        <p className="timer-panel-hint">알림을 받으려면 이 페이지를 열어두세요. 화면이 잠기면 소리가 늦게 울릴 수 있어요.</p>
      </div>
    </section>
  );
}
