import { useCallback, useLayoutEffect } from "react";
import type { RefObject } from "react";

type AutoResizeOptions = {
  enabled?: boolean;
  deps?: unknown[];
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
  const { enabled = true, deps = [] } = options ?? {};

  const resize = useCallback(() => resizeTextarea(ref), [ref]);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    resize();
  }, [enabled, resize, value, ...deps]);

  return resize;
};

export default useAutoResizeTextarea;
