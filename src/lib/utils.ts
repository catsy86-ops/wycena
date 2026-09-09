import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Zabezpieczenie przed CSV Formula Injection (DDE attack w Excelu / Calc)
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str}"`;
  }
  return `"${str}"`;
}
