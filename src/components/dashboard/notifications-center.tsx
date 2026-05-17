"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { useMaterialStore } from "@/store/material-store";
import { useScheduleStore } from "@/store/schedule-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, Clock, Package, Calendar, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { differenceInDays, isToday, isTomorrow, format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";

interface Notification {
  id: string;
  type: "warning" | "danger" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
}

export function NotificationsCenter() {
  const quotes = useQuoteStore((s) => s.quotes);
  const invoices = useInvoiceStore((s) => s.invoices);
  const materials = useMaterialStore((s) => s.materials);
  const events = useScheduleStore((s) => s.events);

  const notifications = useMemo(() => {
    const items: Notification[] = [];
    const now = new Date();

    // Wygasające wyceny (3 dni)
    quotes.forEach((q) => {
      if ((q.status === "wyslana" || q.status === "szkic") && q.validUntil) {
        const days = differenceInDays(new Date(q.validUntil), now);
        if (days <= 3 && days >= 0) {
          items.push({
            id: `exp-${q.id}`,
            type: "warning",
            icon: <Clock className="h-4 w-4" />,
            title: `Wycena ${q.number} wygasa`,
            description: days === 0 ? "Wygasa dziś!" : `Za ${days} ${days === 1 ? "dzień" : "dni"}`,
            href: `/wyceny/${q.id}`,
          });
        } else if (days < 0) {
          items.push({
            id: `expired-${q.id}`,
            type: "danger",
            icon: <AlertTriangle className="h-4 w-4" />,
            title: `Wycena ${q.number} wygasła`,
            description: `${Math.abs(days)} dni temu`,
            href: `/wyceny/${q.id}`,
          });
        }
      }
    });

    // Wyceny bez odpowiedzi >7 dni
    quotes.forEach((q) => {
      if (q.status === "wyslana") {
        const days = differenceInDays(now, new Date(q.updatedAt));
        if (days >= 7) {
          items.push({
            id: `followup-${q.id}`,
            type: "info",
            icon: <FileText className="h-4 w-4" />,
            title: `Follow-up: ${q.clientName}`,
            description: `Wycena ${q.number} wysłana ${days} dni temu`,
            href: `/wyceny/${q.id}`,
          });
        }
      }
    });

    // Przeterminowane faktury
    invoices.forEach((i) => {
      if ((i.status === "niezaplacona" || i.status === "czesciowo") && i.dueDate) {
        const days = differenceInDays(now, new Date(i.dueDate));
        if (days > 0) {
          items.push({
            id: `inv-${i.id}`,
            type: "danger",
            icon: <AlertTriangle className="h-4 w-4" />,
            title: `Faktura ${i.number} przeterminowana`,
            description: `${formatCurrency(i.totalBrutto)} — ${days} dni po terminie`,
            href: "/faktury",
          });
        }
      }
    });

    // Niski stan materiałów
    materials.forEach((m) => {
      if (m.stockQuantity <= m.minStockLevel && m.minStockLevel > 0) {
        items.push({
          id: `stock-${m.id}`,
          type: "warning",
          icon: <Package className="h-4 w-4" />,
          title: `Niski stan: ${m.name}`,
          description: `${m.stockQuantity} / min. ${m.minStockLevel}`,
          href: "/materialy",
        });
      }
    });

    // Dzisiejsze/jutrzejsze wydarzenia
    events.forEach((e) => {
      if (e.status !== "anulowane") {
        const start = new Date(e.startTime);
        if (isToday(start)) {
          items.push({
            id: `event-today-${e.id}`,
            type: "info",
            icon: <Calendar className="h-4 w-4" />,
            title: `Dziś: ${e.title}`,
            description: `${format(start, "HH:mm")} — ${e.clientName}`,
            href: "/harmonogram",
          });
        } else if (isTomorrow(start)) {
          items.push({
            id: `event-tomorrow-${e.id}`,
            type: "info",
            icon: <Calendar className="h-4 w-4" />,
            title: `Jutro: ${e.title}`,
            description: `${format(start, "HH:mm")} — ${e.clientName}`,
            href: "/harmonogram",
          });
        }
      }
    });

    return items.slice(0, 8);
  }, [quotes, invoices, materials, events]);

  if (notifications.length === 0) return null;

  const dangerCount = notifications.filter((n) => n.type === "danger").length;
  const warningCount = notifications.filter((n) => n.type === "warning").length;

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Powiadomienia
          </span>
          <div className="flex gap-1">
            {dangerCount > 0 && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-[10px] px-1.5">{dangerCount}</Badge>}
            {warningCount > 0 && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] px-1.5">{warningCount}</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <AnimatePresence>
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {n.href ? (
                  <Link href={n.href} className="block">
                    <NotificationItem notification={n} />
                  </Link>
                ) : (
                  <NotificationItem notification={n} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const colors = {
    danger: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400",
    warning: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
    info: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400",
  };

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors hover:opacity-80 ${colors[n.type]}`}>
      <div className="mt-0.5 shrink-0">{n.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{n.title}</div>
        <div className="opacity-70 truncate">{n.description}</div>
      </div>
    </div>
  );
}
