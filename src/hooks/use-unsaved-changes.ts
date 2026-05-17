import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Hook do wykrywania niezapisanych zmian.
 * Ostrzega użytkownika przed zamknięciem strony/nawigacją.
 *
 * Użycie:
 * const { markDirty, markClean, isDirty } = useUnsavedChanges();
 * // Po każdej zmianie w formularzu:
 * markDirty();
 * // Po zapisaniu:
 * markClean();
 */
export function useUnsavedChanges() {
  const [isDirty, setIsDirty] = useState(false);
  const dirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    dirtyRef.current = true;
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
    dirtyRef.current = false;
  }, []);

  // Ostrzeżenie przy zamknięciu przeglądarki
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?";
        return e.returnValue;
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { isDirty, markDirty, markClean };
}
