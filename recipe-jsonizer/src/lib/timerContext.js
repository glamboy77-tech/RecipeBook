import { createContext, useContext } from "react";

export const TimerContext = createContext(null);

export function useTimers() {
  const context = useContext(TimerContext);
  if (!context) throw new Error("TimerProvider가 필요합니다.");
  return context;
}
