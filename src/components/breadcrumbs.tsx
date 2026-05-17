"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";

const ROUTE_LABELS: Record<string, string> = {
  "": "Pulpit",
  wyceny: "Wyceny",
  klienci: "Klienci",
  uslugi: "Usługi",
  materialy: "Materiały",
  szablony: "Szablony",
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
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = ROUTE_LABELS[seg] || (seg.startsWith("[") ? seg : seg.length > 15 ? seg.slice(0, 15) + "…" : seg);
    const isLast = i === segments.length - 1;
    return { href, label, isLast, seg };
  });

  return (
    <motion.nav
      className="flex items-center gap-1 text-xs text-muted-foreground mb-3 overflow-x-auto"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-label="Breadcrumb"
    >
      <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors shrink-0">
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3 w-3 opacity-40" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </motion.nav>
  );
}
