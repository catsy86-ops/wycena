import { toast } from "sonner";

/**
 * Soft delete z możliwością cofnięcia.
 * Zamiast natychmiastowego usunięcia, czeka 5s i pozwala cofnąć.
 *
 * Użycie:
 * undoableDelete({
 *   label: "Wycena usunięta",
 *   onDelete: () => remove(id),
 *   onUndo: () => {}, // opcjonalne — jeśli potrzebne przywrócenie
 * });
 */
export function undoableDelete({
  label,
  onDelete,
  onUndo,
  delayMs = 5000,
}: {
  label: string;
  onDelete: () => void | Promise<void>;
  onUndo?: () => void;
  delayMs?: number;
}) {
  let cancelled = false;

  const toastId = toast(label, {
    duration: delayMs,
    action: {
      label: "Cofnij",
      onClick: () => {
        cancelled = true;
        onUndo?.();
        toast.success("Cofnięto");
      },
    },
  });

  // Wykonaj usunięcie po opóźnieniu
  setTimeout(async () => {
    if (!cancelled) {
      await onDelete();
    }
  }, delayMs);
}

/**
 * Natychmiastowe usunięcie z potwierdzeniem w toast (bez undo).
 */
export function confirmDelete({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void | Promise<void>;
}) {
  toast.promise(
    async () => { await onDelete(); },
    {
      loading: "Usuwanie...",
      success: label,
      error: "Błąd podczas usuwania",
    }
  );
}
