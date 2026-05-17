import { useState, useCallback } from "react";

/**
 * Hook do obsługi loading state na przyciskach.
 * Zamienia przycisk w spinner podczas async operacji.
 *
 * Użycie:
 * const { loading, execute } = useLoadingAction();
 * <Button disabled={loading} onClick={() => execute(async () => { await save(); })}>
 *   {loading ? <Loader2 className="animate-spin" /> : <Save />}
 *   {loading ? "Zapisywanie..." : "Zapisz"}
 * </Button>
 */
export function useLoadingAction() {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (fn: () => Promise<void>) => {
    if (loading) return;
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { loading, execute };
}

/**
 * Hook do wielu niezależnych loading states.
 * Przydatny gdy na stronie jest wiele przycisków z async akcjami.
 *
 * Użycie:
 * const { isLoading, execute } = useMultiLoadingAction();
 * <Button disabled={isLoading("save")} onClick={() => execute("save", async () => { ... })}>
 */
export function useMultiLoadingAction() {
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  const isLoading = useCallback((key: string) => loadingKeys.has(key), [loadingKeys]);

  const execute = useCallback(async (key: string, fn: () => Promise<void>) => {
    if (loadingKeys.has(key)) return;
    setLoadingKeys((prev) => new Set(prev).add(key));
    try {
      await fn();
    } finally {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [loadingKeys]);

  return { isLoading, execute };
}
