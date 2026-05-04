import { useState, useRef, useCallback, useEffect } from "react";

export type TimerStatus = "idle" | "running" | "paused" | "stopped";

interface PausedTime {
  start: string;
  end: string;
}

interface TimerState {
  status: TimerStatus;
  elapsedSeconds: number;
  startedAt: string | null;
  pausedTimes: PausedTime[];
}

export function useTimer() {
  const [state, setState] = useState<TimerState>({
    status: "idle",
    elapsedSeconds: 0,
    startedAt: null,
    pausedTimes: [],
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningStartRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const pauseStartRef = useRef<string | null>(null);

  const tick = useCallback(() => {
    if (runningStartRef.current !== null) {
      const now = Date.now();
      const elapsed = accumulatedRef.current + Math.floor((now - runningStartRef.current) / 1000);
      setState((prev) => ({ ...prev, elapsedSeconds: elapsed }));
    }
  }, []);

  const start = useCallback(() => {
    accumulatedRef.current = 0;
    runningStartRef.current = Date.now();
    setState({
      status: "running",
      elapsedSeconds: 0,
      startedAt: new Date().toISOString(),
      pausedTimes: [],
    });
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (runningStartRef.current !== null) {
      accumulatedRef.current += Math.floor((Date.now() - runningStartRef.current) / 1000);
      runningStartRef.current = null;
    }
    pauseStartRef.current = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      status: "paused",
      elapsedSeconds: accumulatedRef.current,
    }));
  }, []);

  const resume = useCallback(() => {
    const pauseEnd = new Date().toISOString();
    runningStartRef.current = Date.now();
    setState((prev) => ({
      ...prev,
      status: "running",
      pausedTimes: pauseStartRef.current
        ? [...prev.pausedTimes, { start: pauseStartRef.current, end: pauseEnd }]
        : prev.pausedTimes,
    }));
    pauseStartRef.current = null;
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (runningStartRef.current !== null) {
      accumulatedRef.current += Math.floor((Date.now() - runningStartRef.current) / 1000);
      runningStartRef.current = null;
    }
    const finalPaused = pauseStartRef.current
      ? [...state.pausedTimes, { start: pauseStartRef.current, end: new Date().toISOString() }]
      : state.pausedTimes;
    pauseStartRef.current = null;

    setState((prev) => ({
      ...prev,
      status: "stopped",
      elapsedSeconds: accumulatedRef.current,
      pausedTimes: finalPaused,
    }));
  }, [state.pausedTimes]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    accumulatedRef.current = 0;
    runningStartRef.current = null;
    pauseStartRef.current = null;
    setState({ status: "idle", elapsedSeconds: 0, startedAt: null, pausedTimes: [] });
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { ...state, start, pause, resume, stop, reset };
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
