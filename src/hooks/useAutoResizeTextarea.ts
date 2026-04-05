import { useCallback, useLayoutEffect } from "react";
import type { RefObject } from "react";

type AutoResizeOptions = {
  enabled?: boolean;
};

const resizeTextarea = (ref: RefObject<HTMLTextAreaElement | null>) => {
  if (!ref.current) {
    return;
  }

  ref.current.style.height = "0px";
  ref.current.style.height = `${ref.current.scrollHeight}px`;
};

const useAutoResizeTextarea = (
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  options?: AutoResizeOptions,
) => {
  const { enabled = true } = options ?? {};

  const resize = useCallback(() => resizeTextarea(ref), [ref]);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    resize();
  }, [enabled, resize, value]);

  return resize;
};

export default useAutoResizeTextarea;
