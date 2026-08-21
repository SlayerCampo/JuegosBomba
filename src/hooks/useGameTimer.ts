/**
 * useGameTimer — absolute-timestamp-based countdown for Palabras Bomba
 *
 * CRITICAL: This timer is driven by `turnEndTime` — an absolute epoch timestamp
 * broadcast by the host to ALL clients. This means every player sees the exact
 * same deadline regardless of when they received the message or their local clock
 * drift. This matches the vanilla implementation precisely.
 *
 * The hook returns:
 *   - timeLeft: number (seconds remaining, 0-clamped)
 *   - progress: number (0.0 = full, 1.0 = empty — drives the bomb fuse bar width)
 *   - isExpired: boolean (true when remaining <= 0)
 *   - start(turnEndTime, totalDuration): starts the timer
 *   - stop(): clears the interval
 *
 * The parent is responsible for acting on isExpired (triggering boom, etc.).
 * We do NOT trigger side effects here — the hook only tracks time.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const TICK_INTERVAL_MS = 100; // 100ms tick for smooth display

export interface UseGameTimerReturn {
  timeLeft: number;       // seconds remaining (clamped to 0)
  progress: number;       // 0.0 (full) → 1.0 (empty), drives fuse bar
  isExpired: boolean;
  start: (turnEndTime: number, totalDurationSeconds: number) => void;
  stop: () => void;
  reset: () => void;
}

export function useGameTimer(): UseGameTimerReturn {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(1);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setTimeLeft(0);
    setProgress(0);
    setIsExpired(false);
  }, [stop]);

  const start = useCallback(
    (turnEndTime: number, totalDurationSeconds: number) => {
      stop(); // clear any running timer first

      endTimeRef.current = turnEndTime;
      totalDurationRef.current = Math.max(0.1, totalDurationSeconds);

      setIsExpired(false);

      const tick = () => {
        const remaining = Math.max(0, (endTimeRef.current - Date.now()) / 1000);
        const elapsed = totalDurationRef.current - remaining;
        const prog = Math.min(1, elapsed / totalDurationRef.current);

        setTimeLeft(remaining);
        setProgress(prog);

        if (remaining <= 0) {
          setIsExpired(true);
          stop();
        }
      };

      // Run immediately then on interval
      tick();
      intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    },
    [stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return stop;
  }, [stop]);

  return { timeLeft, progress, isExpired, start, stop, reset };
}
