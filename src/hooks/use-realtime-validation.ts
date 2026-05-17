import { useState, useCallback, useRef } from "react";
import type { ZodSchema } from "zod";

/**
 * Hook do walidacji w czasie rzeczywistym.
 * Waliduje pole po 300ms od ostatniej zmiany (debounce).
 *
 * Użycie:
 * const { errors, validate, clearError } = useRealtimeValidation(schema);
 * <Input
 *   value={form.name}
 *   onChange={(e) => { setForm({...form, name: e.target.value}); validate("name", e.target.value); }}
 *   className={errors.name ? "border-destructive" : ""}
 * />
 * {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
 */
export function useRealtimeValidation<T extends Record<string, unknown>>(schema: ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const validate = useCallback(
    (field: string, value: unknown) => {
      if (timeoutsRef.current[field]) {
        clearTimeout(timeoutsRef.current[field]);
      }

      timeoutsRef.current[field] = setTimeout(() => {
        const partial = { [field]: value } as unknown as T;
        const result = schema.safeParse(partial);
        if (result.success) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
        } else {
          const issues = result.error?.issues || [];
          const fieldIssue = issues.find((e) => String(e.path[0]) === field);
          if (fieldIssue) {
            setErrors((prev) => ({ ...prev, [field]: fieldIssue.message }));
          } else {
            setErrors((prev) => {
              const next = { ...prev };
              delete next[field];
              return next;
            });
          }
        }
      }, 300);
    },
    [schema]
  );

  const clearError = useCallback((field: string) => {
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const clearAll = useCallback(() => { setErrors({}); }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return { errors, validate, clearError, clearAll, hasErrors };
}
