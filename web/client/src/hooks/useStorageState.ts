import { useState, useEffect, useCallback } from "react";

export function useStorageState<T>(
  key: string,
  initialValue: T,
  storage: Storage = localStorage
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const stored = storage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (error) {
      console.warn(`Error reading "${key}" from storage:`, error);
    }

    return initialValue;
  });

  useEffect(() => {
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error writing "${key}" to storage:`, error);
    }
  }, [key, state, storage]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        return nextValue;
      });
    },
    []
  );

  return [state, setValue];
}
