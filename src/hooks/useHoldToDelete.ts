import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

type HoldToDeleteOptions = {
  holdDurationMs?: number;
  onComplete: (id: string) => void;
};

type HoldToDeleteHandlers<T extends HTMLElement> = {
  holdingId: string | null;
  holdProgress: number;
  beginHold: (event: PointerEvent<T>, id: string) => void;
  endHold: (event: PointerEvent<T>) => void;
  stopHold: () => void;
};

const useHoldToDelete = <T extends HTMLElement>({
  holdDurationMs = 700,
  onComplete,
}: HoldToDeleteOptions): HoldToDeleteHandlers<T> => {
  const [holdingId, setHoldingId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopHold = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    holdStartRef.current = null;
    setHoldingId(null);
    setHoldProgress(0);
  }, []);

  const beginHold = useCallback(
    (event: PointerEvent<T>, id: string) => {
      const target = event.currentTarget;
      const pointerId = event.pointerId;

      target.setPointerCapture(pointerId);
      setHoldingId(id);
      setHoldProgress(0);
      holdStartRef.current = performance.now();

      const step = (now: number) => {
        if (holdStartRef.current === null) {
          return;
        }
        const elapsed = now - holdStartRef.current;
        const progress = Math.min(1, elapsed / holdDurationMs);
        setHoldProgress(progress);

        if (progress >= 1) {
          if (target.hasPointerCapture(pointerId)) {
            target.releasePointerCapture(pointerId);
          }
          onComplete(id);
          stopHold();
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [holdDurationMs, onComplete, stopHold],
  );

  const endHold = useCallback(
    (event: PointerEvent<T>) => {
      const target = event.currentTarget;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      stopHold();
    },
    [stopHold],
  );

  useEffect(() => () => stopHold(), [stopHold]);

  return {
    holdingId,
    holdProgress,
    beginHold,
    endHold,
    stopHold,
  };
};

export default useHoldToDelete;
