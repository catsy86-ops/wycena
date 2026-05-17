import { useRef, useCallback } from "react";
import { toast } from "sonner";

const UNDO_TIMEOUT = 5000; // 5 seconds

/**
 * Hook do soft-delete z możliwością cofnięcia.
 * Zamiast natychmiastowego usunięcia, daje 5s na "Cofnij".
 *
 * Użycie:
 * const { softDelete } = useUndoDelete({
 *   onDelete: (id) => removeFromStore(id),
 *   entityName: "Wycena",
 * });
 * softDelete(quoteId, quote.number);
 */
export function useUndoDelete<T = number>({
  onDelete,
  entityName = "Element",
}: {
  onDelete: (id: T) => void;
  entityName?: string;
}) {
  const pendingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const softDelete = useCallback(
    (id: T, label?: string) => {
      const key = String(id);

      // Ustaw timeout na faktyczne usunięcie
      const timeout = setTimeout(() => {
        onDelete(id);
        pendingRef.current.delete(key);
      }, UNDO_TIMEOUT);

      pendingRef.current.set(key, timeout);

      // Toast z przyciskiem Cofnij
      toast(`${entityName} "${label || key}" usunięty`, {
        action: {
          label: "Cofnij",
          onClick: () => {
            // Anuluj usunięcie
            const t = pendingRef.current.get(key);
            if (t) {
              clearTimeout(t);
              pendingRef.current.delete(key);
              toast.success("Cofnięto usunięcie");
            }
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [onDelete, entityName]
  );

  return { softDelete };
}
