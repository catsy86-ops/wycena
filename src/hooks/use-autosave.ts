import { useEffect, useRef, useState, useCallback } from "react";

const AUTOSAVE_DELAY = 5000; // 5 seconds

interface AutosaveOptions<T> {
  key: string;
  data: T;
  enabled?: boolean;
}

/**
 * Hook do autosave z debounce.
 * Zapisuje dane do localStorage co 5s po ostatniej zmianie.
 * Zwraca status zapisu i funkcję do odzyskania danych.
 */
export function useAutosave<T>({ key, data, enabled = true }: AutosaveOptions<T>) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Debounced save
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setStatus("idle");
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(dataRef.current));
        setStatus("saved");
        setLastSaved(new Date());
        // Reset status after 2s
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        // localStorage full — ignore
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, key, enabled]);

  // Recover saved data
  const recover = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as T;
    } catch { /* ignore */ }
    return null;
  }, [key]);

  // Clear saved data
  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setStatus("idle");
    setLastSaved(null);
  }, [key]);

  // Check if there's a recovery available
  const hasRecovery = useCallback((): boolean => {
    return localStorage.getItem(key) !== null;
  }, [key]);

  return { status, lastSaved, recover, clear, hasRecovery };
}
