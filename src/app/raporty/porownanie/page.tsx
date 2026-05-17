"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuoteStore } from "@/store/quote-store";
import { STATUS_LABELS, UNIT_LABELS, type QuoteStatus } from "@/types";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, GitCompare, ArrowUpRight, ArrowDownRight, Minus, Equal } from "lucide-react";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  szkic: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wyslana: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  zaakceptowana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  odrzucona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

function DiffBadge({ a, b }: { a: number; b: number }) {
  if (a === b || (a === 0 && b === 0)) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Equal className="h-3 w-3" />Równe</span>;
  const diff = round(b - a);
  const pct = a > 0 ? round(((b - a) / a) * 100) : 0;
  if (diff > 0) return <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />+{formatCurrency(diff)} ({pct > 0 ? "+" : ""}{pct}%)</span>;
  return <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" />{formatCurrency(diff)} ({pct}%)</span>;
}

export default function PorownaniePage() {
  const router = useRouter();
  const quotes = useQuoteStore((s) => s.quotes);
  const [quoteAId, setQuoteAId] = useState<string>("");
  const [quoteBId, setQuoteBId] = useState<string>("");

  const quoteA = useMemo(() => quotes.find((q) => q.id === parseInt(quoteAId)), [quotes, quoteAId]);
  const quoteB = useMemo(() => quotes.find((q) => q.id === parseInt(quoteBId)), [quotes, quoteBId]);

  const comparison = useMemo(() => {
    if (!quoteA || !quoteB) return null;
    return {
      nettoDiff: round(quoteB.totalNetto - quoteA.totalNetto),
      bruttoDiff: round(quoteB.totalBrutto - quoteA.totalBrutto),
      itemCountDiff: quoteB.items.length - quoteA.items.length,
      // Pozycje wspólne (po nazwie)
      commonItems: quoteA.items.filter((a) => quoteB.items.some((b) => b.name.toLowerCase() === a.name.toLowerCase())),
      onlyInA: quoteA.items.filter((a) => !quoteB.items.some((b) => b.name.toLowerCase() === a.name.toLowerCase())),
      onlyInB: quoteB.items.filter((b) => !quoteA.items.some((a) => a.name.toLowerCase() === b.name.toLowerCase())),
    };
  }, [quoteA, quoteB]);

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6 max-w-6xl mx-auto">
        <StaggerItem>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="btn-ghost" onClick={() => router.push("/raporty")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe">Porównanie wycen</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Porównaj dwie wyceny side-by-side</p>
            </div>
          </div>
        </StaggerItem>

        {/* Selektory */}
        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Wycena A (bazowa)</label>
              <Select value={quoteAId} onValueChange={(v) => setQuoteAId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Wybierz wycenę..." /></SelectTrigger>
                <SelectContent>
                  {quotes.map((q) => (
                    <SelectItem key={q.id} value={String(q.id)}>
                      {q.number} — {q.clientName || "Brak klienta"} ({formatCurrency(q.totalBrutto)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "oklch(0.52 0.19 220 / 0.1)", border: "1px solid oklch(0.52 0.19 220 / 0.2)" }}>
                <GitCompare className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Wycena B (porównywana)</label>
              <Select value={quoteBId} onValueChange={(v) => setQuoteBId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Wybierz wycenę..." /></SelectTrigger>
                <SelectContent>
                  {quotes.filter((q) => String(q.id) !== quoteAId).map((q) => (
                    <SelectItem key={q.id} value={String(q.id)}>
                      {q.number} — {q.clientName || "Brak klienta"} ({formatCurrency(q.totalBrutto)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </StaggerItem>

        {/* Wynik porównania */}
        {quoteA && quoteB && comparison && (
          <>
            {/* Podsumowanie różnic */}
            <StaggerItem>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Karta A */}
                <Card className="card-modern border-l-4" style={{ borderLeftColor: "#3b82f6" }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{quoteA.number}</span>
                      <Badge className={STATUS_COLORS[quoteA.status]}>{STATUS_LABELS[quoteA.status]}</Badge>
                    </CardTitle>
                    <CardDescription>{quoteA.clientName} · {format(new Date(quoteA.createdAt), "dd.MM.yyyy", { locale: pl })}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Netto:</span><span className="font-semibold">{formatCurrency(quoteA.totalNetto)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Brutto:</span><span className="font-bold text-primary">{formatCurrency(quoteA.totalBrutto)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pozycji:</span><span>{quoteA.items.length}</span></div>
                    {quoteA.globalDiscountPercent > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Rabat:</span><span>{quoteA.globalDiscountPercent}%</span></div>}
                  </CardContent>
                </Card>

                {/* Karta B */}
                <Card className="card-modern border-l-4" style={{ borderLeftColor: "#10b981" }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{quoteB.number}</span>
                      <Badge className={STATUS_COLORS[quoteB.status]}>{STATUS_LABELS[quoteB.status]}</Badge>
                    </CardTitle>
                    <CardDescription>{quoteB.clientName} · {format(new Date(quoteB.createdAt), "dd.MM.yyyy", { locale: pl })}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Netto:</span><span className="font-semibold">{formatCurrency(quoteB.totalNetto)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Brutto:</span><span className="font-bold text-primary">{formatCurrency(quoteB.totalBrutto)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pozycji:</span><span>{quoteB.items.length}</span></div>
                    {quoteB.globalDiscountPercent > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Rabat:</span><span>{quoteB.globalDiscountPercent}%</span></div>}
                  </CardContent>
                </Card>
              </div>
            </StaggerItem>

            {/* Różnice */}
            <StaggerItem>
              <Card className="card-modern" style={{ background: "oklch(0.52 0.19 220 / 0.03)", borderColor: "oklch(0.52 0.19 220 / 0.15)" }}>
                <CardHeader className="pb-2"><CardTitle className="text-base">Różnice</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Różnica netto:</span>
                      <div><DiffBadge a={quoteA.totalNetto} b={quoteB.totalNetto} /></div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Różnica brutto:</span>
                      <div><DiffBadge a={quoteA.totalBrutto} b={quoteB.totalBrutto} /></div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Różnica pozycji:</span>
                      <div className="text-xs font-semibold">
                        {comparison.itemCountDiff === 0 ? "Taka sama ilość" : comparison.itemCountDiff > 0 ? `+${comparison.itemCountDiff} w B` : `${comparison.itemCountDiff} w B`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Pozycje wspólne z porównaniem cen */}
            {comparison.commonItems.length > 0 && (
              <StaggerItem>
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Wspólne pozycje — porównanie cen</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nazwa</TableHead>
                            <TableHead className="text-right">Cena A</TableHead>
                            <TableHead className="text-right">Cena B</TableHead>
                            <TableHead className="text-right">Ilość A</TableHead>
                            <TableHead className="text-right">Ilość B</TableHead>
                            <TableHead>Różnica</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.commonItems.map((itemA) => {
                            const itemB = quoteB.items.find((b) => b.name.toLowerCase() === itemA.name.toLowerCase())!;
                            return (
                              <TableRow key={itemA.id}>
                                <TableCell className="font-medium text-sm">{itemA.name}</TableCell>
                                <TableCell className="text-right text-sm">{formatCurrency(itemA.priceNettoPerUnit)}</TableCell>
                                <TableCell className="text-right text-sm">{formatCurrency(itemB.priceNettoPerUnit)}</TableCell>
                                <TableCell className="text-right text-sm">{itemA.quantity} {UNIT_LABELS[itemA.unit]}</TableCell>
                                <TableCell className="text-right text-sm">{itemB.quantity} {UNIT_LABELS[itemB.unit]}</TableCell>
                                <TableCell><DiffBadge a={itemA.bruttoTotal} b={itemB.bruttoTotal} /></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )}

            {/* Pozycje tylko w A / tylko w B */}
            {(comparison.onlyInA.length > 0 || comparison.onlyInB.length > 0) && (
              <StaggerItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparison.onlyInA.length > 0 && (
                    <Card className="card-modern border-l-4" style={{ borderLeftColor: "#3b82f6" }}>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Tylko w wycenie A ({comparison.onlyInA.length})</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {comparison.onlyInA.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="truncate max-w-[60%]">{item.name}</span>
                              <span className="font-semibold shrink-0">{formatCurrency(item.bruttoTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {comparison.onlyInB.length > 0 && (
                    <Card className="card-modern border-l-4" style={{ borderLeftColor: "#10b981" }}>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Tylko w wycenie B ({comparison.onlyInB.length})</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {comparison.onlyInB.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="truncate max-w-[60%]">{item.name}</span>
                              <span className="font-semibold shrink-0">{formatCurrency(item.bruttoTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </StaggerItem>
            )}
          </>
        )}

        {/* Empty state */}
        {(!quoteA || !quoteB) && (
          <StaggerItem>
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <GitCompare className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-sm">Wybierz dwie wyceny do porównania</p>
            </div>
          </StaggerItem>
        )}
      </StaggerContainer>
    </PageTransition>
  );
}
