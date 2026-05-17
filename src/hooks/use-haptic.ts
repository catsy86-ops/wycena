/**
 * Hook do haptic feedback na mobile.
 * Wibracja przy ważnych akcjach (start/stop timer, usunięcie, sukces).
 */
export function useHaptic() {
  function vibrate(pattern: number | number[] = 50) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  return {
    /** Krótka wibracja — kliknięcie, toggle */
    tap: () => vibrate(30),
    /** Średnia wibracja — sukces, zapisanie */
    success: () => vibrate([30, 50, 30]),
    /** Mocna wibracja — usunięcie, błąd */
    heavy: () => vibrate(100),
    /** Podwójna wibracja — start/stop timer */
    double: () => vibrate([50, 30, 50]),
    /** Custom pattern */
    vibrate,
  };
}
