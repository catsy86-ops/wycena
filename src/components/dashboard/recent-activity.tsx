"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useClientStore } from "@/store/client-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { formatCurrency } from "@/lib/calculations";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "quote" | "client";
  title: string;
  subtitle: string;
  time: Date;
  href: string;
  value?: number;
}

export function RecentActivity() {
  const quotes = useQuoteStore((s) => s.quotes);
  const clients = useClientStore((s) => s.clients);

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    // Ostatnie wyceny
    quotes.slice(0, 5).forEach((q) => {
      items.push({
        id: `q-${q.id}`,
        type: "quote",
        title: q.number,
        subtitle: q.clientName || "Brak klienta",
        time: new Date(q.updatedAt),
        href: `/wyceny/${q.id}`,
        value: q.totalBrutto,
      });
    });

    // Ostatni klienci
    [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .forEach((c) => {
        items.push({
          id: `c-${c.id}`,
          type: "client",
          title: c.name,
          subtitle: c.phone,
          time: new Date(c.createdAt),
          href: `/klienci/${c.id}`,
        });
      });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 6);
  }, [quotes, clients]);

  if (activities.length === 0) return null;

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Ostatnia aktywność
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2">
          {activities.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={item.href}>
                <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors group">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                    item.type === "quote"
                      ? "bg-primary/10 text-primary"
                      : "bg-violet-500/10 text-violet-500"
                  }`}>
                    {item.type === "quote" ? <FileText className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {item.value && <div className="text-xs font-bold text-primary">{formatCurrency(item.value)}</div>}
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(item.time, { addSuffix: true, locale: pl })}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
