"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";

const AUTOSAVE_KEY_PREFIX = "gksystem_autosave_";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutosaveProps {
  /** Unikalne ID formularza (np. "nowa-wycena" lub "edycja-123") */
  formId: string;
  /** Dane do zapisania */
  data: unknown;
  /** Opóźnienie w ms (domyślnie 5000) */
  debounceMs?: number;
  /** Czy autosave jest aktywny */
  enabled?: boolean;
}

/**
 * Hook autosave — zapisuje dane do localStorage z debounce.
 */
export function useAutosave({ formId, data, debounceMs = 5000, enabled = true }: AutosaveProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const key = AUTOSAVE_KEY_PREFIX + formId;

  // Debounced save
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      try {
        setStatus("saving");
        localStorage.setItem(key, JSON.stringify({ data, savedAt: new Date().toISOString() }));
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, key, debounceMs, enabled]);

  // Restore
  const restore = useCallback((): unknown | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data;
    } catch {
      return null;
    }
  }, [key]);

  // Clear
  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setStatus("idle");
  }, [key]);

  return { status, restore, clear };
}

/**
 * Wizualny wskaźnik statusu autosave.
 */
export function AutosaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status !== "idle" && (
        <motion.div
          key={status}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="flex items-center gap-1.5 text-xs"
        >
          {status === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Zapisywanie...</span>
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Zapisano</span>
            </>
          )}
          {status === "error" && (
            <>
              <CloudOff className="h-3 w-3 text-red-500" />
              <span className="text-red-500">Błąd zapisu</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Sprawdza czy istnieje zapisany draft.
 */
export function hasDraft(formId: string): boolean {
  try {
    return localStorage.getItem(AUTOSAVE_KEY_PREFIX + formId) !== null;
  } catch {
    return false;
  }
}

/**
 * Pobiera zapisany draft.
 */
export function getDraft<T>(formId: string): T | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY_PREFIX + formId);
    if (!raw) return null;
    return JSON.parse(raw).data as T;
  } catch {
    return null;
  }
}

/**
 * Czyści draft.
 */
export function clearDraft(formId: string): void {
  localStorage.removeItem(AUTOSAVE_KEY_PREFIX + formId);
}
