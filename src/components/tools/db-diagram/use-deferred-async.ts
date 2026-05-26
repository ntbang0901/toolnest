import { useEffect, useState, type DependencyList } from "react";

export function useDeferredAsync<T>(
  fn: () => Promise<T>,
  deps: DependencyList,
  initial: T,
): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let cancelled = false;
    fn().then((next) => {
      if (!cancelled) setValue(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
