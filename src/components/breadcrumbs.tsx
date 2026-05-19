"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const ROUTE_LABELS: Record<string, string> = {
  "": "Pulpit",
  wyceny: "Wyceny",
  klienci: "Klienci",
  uslugi: "Usługi",
  materialy: "Materiały",
  szablony: "Szablony",
  elektryka: "Elektryka",
  harmonogram: "Harmonogram",
  czas: "Czas pracy",
  faktury: "Faktury",
  raporty: "Raporty",
  ustawienia: "Ustawienia",
  nowa: "Nowa",
  edytuj: "Edycja",
  porownanie: "Porównanie",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const segments = pathname.split("/").filter(Boolean);

  // Nie pokazuj na stronie głównej
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = ROUTE_LABELS[seg] || (seg.length > 16 ? seg.slice(0, 16) + "…" : seg);
    const isLast = i === segments.length - 1;
    return { href, label, isLast, seg };
  });

  return (
    <motion.nav
      className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 overflow-x-auto"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-label="Breadcrumb"
    >
      {/* Przycisk powrotu — widoczny na podstronach */}
      {segments.length > 0 && (
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-accent transition-colors shrink-0 touch-target"
          aria-label="Wróć"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Home */}
      <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors shrink-0">
        <Home className="h-3 w-3" />
      </Link>

      {/* Crumbs */}
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5 shrink-0">
          <ChevronRight className="h-3 w-3 opacity-40" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground truncate max-w-32">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-primary transition-colors truncate max-w-24">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </motion.nav>
  );
}
