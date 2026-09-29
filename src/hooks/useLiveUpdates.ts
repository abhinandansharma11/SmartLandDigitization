import { useEffect, useRef, useState } from 'react';

export const useLiveInterval = (callback: () => void, intervalMs: number, enabled = true) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    const tick = () => {
      if (document.visibilityState === 'visible') callbackRef.current();
      timer = window.setTimeout(tick, intervalMs);
    };

    timer = window.setTimeout(tick, intervalMs);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabled, intervalMs]);
};

export const useAnimatedNumber = (target: number, durationMs = 700) => {
  const [value, setValue] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const start = previous.current;
    const delta = target - start;
    if (!delta) return;

    const startedAt = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(update);
      else previous.current = target;
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, target]);

  return value;
};
