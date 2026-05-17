"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Globe, RefreshCw, Plus, Check, AlertCircle, Loader2,
  Zap, Database, ExternalLink, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import type { QuoteItem, ExternalPricingItem, Unit, VatRate } from "@/types";
import { calcQuoteItem, formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface ApiPricingResult {
  source: string;
  items: ExternalPricingItem[];
  fetchedAt: string;
  error?: string;
}

export interface ExternalPricingPanelProps {
  onApplyItems: (items: QuoteItem[]) => void;
  onApplyPriceToItem?: (itemId: string, price: number, source: string) => void;
  existingItems: QuoteItem[];
}

type SourceKey = "builtin_mock" | "cennik_gus" | "custom";

const VALID_UNITS: Unit[] = ["szt", "kg", "m", "m2", "godz", "kpl", "mb", "komplet"];

function generateItemId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function mapUnit(raw: string): Unit {
  const lower = raw.toLowerCase().trim();
  if ((VALID_UNITS as string[]).includes(lower)) return lower as Unit;
  const aliases: Record<string, Unit> = {
    "godz.": "godz", "szt.": "szt", "kpl.": "kpl",
    "m²": "m2", "h": "godz", "hr": "godz", "pcs": "szt", "pc": "szt",
  };
  return aliases[lower] ?? "szt";
}

function mapVatRate(raw: number): VatRate {
  if (raw === 0 || raw === 8 || raw === 23) return raw as VatRate;
  return 23;
}

function externalItemToQuoteItem(ext: ExternalPricingItem): QuoteItem {
  return calcQuoteItem({
    id: generateItemId(),
    name: ext.name,
    quantity: 1,
    unit: mapUnit(ext.unit),
    priceNettoPerUnit: ext.priceNetto,
    vatRate: mapVatRate(ext.vatRate),
    discountPercent: 0,
    nettotal: 0,
    vatAmount: 0,
    bruttoTotal: 0,
    externalPrice: ext.priceNetto,
    externalPriceSource: ext.externalId,
  });
}

function fuzzyMatch(a: string, b: string): boolean {
  return a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
}

const SOURCE_OPTIONS = [
  { key: "builtin_mock" as SourceKey, label: "Mock (demo)", icon: <Database className="h-4 w-4" />, description: "Wbudowane przykładowe ceny hydrauliczne 2024/2025" },
  { key: "cennik_gus" as SourceKey, label: "Cennik GUS", icon: <Globe className="h-4 w-4" />, description: "Wskaźniki kosztów budowlanych GUS 2024" },
  { key: "custom" as SourceKey, label: "Własne API", icon: <ExternalLink className="h-4 w-4" />, description: "Własny endpoint cenowy (JSON)" },
];

const CATEGORY_COLORS: Record<string, string> = {
  robocizna: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  montaz: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  naprawa: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  materialy: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

export function ExternalPricingPanel({ onApplyItems, onApplyPriceToItem, existingItems }: ExternalPricingPanelProps) {
  const [source, setSource] = useState<SourceKey>("builtin_mock");
  const [customUrl, setCustomUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiPricingResult | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setAddedIds(new Set());
    try {
      const params = new URLSearchParams({ source });
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      if (source === "custom") {
        if (!customUrl.trim()) { toast.error("Podaj URL własnego API"); setLoading(false); return; }
        params.set("url", customUrl.trim());
        if (customApiKey.trim()) params.set("apiKey", customApiKey.trim());
      }
      const res = await fetch(`/api/pricing?${params.toString()}`);
      const data: ApiPricingResult = await res.json();
      setResult(data);
      if (data.error) toast.error(`Błąd: ${data.error}`);
      else toast.success(`Pobrano ${data.items.length} pozycji`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nieznany błąd";
      toast.error(`Błąd połączenia: ${msg}`);
      setResult({ source, items: [], fetchedAt: new Date().toISOString(), error: msg });
    } finally {
      setLoading(false);
    }
  }, [source, searchQuery, customUrl, customApiKey]);

  const filteredItems = useMemo(() => {
    if (!result) return [];
    if (!filterText.trim()) return result.items;
    const q = filterText.toLowerCase();
    return result.items.filter(
      (item) => item.name.toLowerCase().includes(q) || (item.category ?? "").toLowerCase().includes(q)
    );
  }, [result, filterText]);

  const handleAddItem = useCallback((ext: ExternalPricingItem, idx: number) => {
    onApplyItems([externalItemToQuoteItem(ext)]);
    setAddedIds((prev) => new Set(prev).add(`${idx}`));
    toast.success(`Dodano: ${ext.name}`);
  }, [onApplyItems]);

  const handleAddAll = useCallback(() => {
    if (!filteredItems.length) return;
    onApplyItems(filteredItems.map(externalItemToQuoteItem));
    setAddedIds(new Set(filteredItems.map((_, i) => `${i}`)));
    toast.success(`Dodano ${filteredItems.length} pozycji`);
  }, [filteredItems, onApplyItems]);

  function getPriceComparison(ext: ExternalPricingItem) {
    const match = existingItems.find((item) => fuzzyMatch(item.name, ext.name));
    if (!match) return { existingItem: null, diff: null };
    const diff = Math.abs(match.priceNettoPerUnit - ext.priceNetto) < 0.01
      ? "equal" : ext.priceNetto < match.priceNettoPerUnit ? "cheaper" : "more_expensive";
    return { existingItem: match, diff: diff as "cheaper" | "more_expensive" | "equal" };
  }

  const sourceOption = SOURCE_OPTIONS.find((s) => s.key === source)!;

  return (
    <Card className="card-modern">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5" style={{ color: "oklch(0.52 0.19 220)" }} />
          Zewnętrzne cenniki
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SOURCE_OPTIONS.map((opt) => (
            <motion.button
              key={opt.key}
              onClick={() => { setSource(opt.key); setResult(null); setAddedIds(new Set()); }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                source === opt.key
                  ? "border-primary bg-primary/8 text-primary font-semibold"
                  : "border-border bg-card hover:bg-accent hover:border-primary/30"
              }`}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{sourceOption.description}</p>

        {/* Custom API inputs */}
        <AnimatePresence>
          {source === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 overflow-hidden"
            >
              <Input placeholder="URL endpointu (np. https://api.example.com/prices)" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} className="text-sm" />
              <Input placeholder="Klucz API (opcjonalnie)" type="password" value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} className="text-sm" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + fetch */}
        <div className="flex gap-2">
          <Input
            placeholder="Szukaj (np. bateria, rura, montaż...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPrices()}
            className="text-sm"
          />
          <Button onClick={fetchPrices} disabled={loading} className="btn-primary shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1">Pobierz</span>
          </Button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {result?.error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Błąd pobierania</p>
                <p className="text-xs mt-0.5 opacity-80">{result.error}</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={fetchPrices}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && !result.error && result.items.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{filteredItems.length} z {result.items.length} pozycji</span>
                  <span>·</span>
                  <span>{new Date(result.fetchedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </div>
                <Button size="sm" className="btn-primary h-8 text-xs" onClick={handleAddAll}>
                  <Plus className="h-3.5 w-3.5" />
                  Dodaj wszystkie ({filteredItems.length})
                </Button>
              </div>
              <Input placeholder="Filtruj wyniki..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="text-sm h-8" />
              <Separator />
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="min-w-48 text-xs">Nazwa</TableHead>
                      <TableHead className="w-16 text-xs">Jedn.</TableHead>
                      <TableHead className="w-28 text-xs text-right">Cena netto</TableHead>
                      <TableHead className="w-16 text-xs text-center">VAT</TableHead>
                      <TableHead className="w-24 text-xs">Kategoria</TableHead>
                      <TableHead className="w-40 text-xs">Porównanie</TableHead>
                      <TableHead className="w-28 text-xs text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredItems.map((item, idx) => {
                        const { existingItem, diff } = getPriceComparison(item);
                        const isAdded = addedIds.has(`${idx}`);
                        return (
                          <motion.tr
                            key={`${item.externalId ?? item.name}-${idx}`}
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.15 }}
                            className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                          >
                            <TableCell className="py-2">
                              <div className="font-medium text-sm leading-tight">{item.name}</div>
                              {item.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</div>}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-muted-foreground">{item.unit}</TableCell>
                            <TableCell className="py-2 text-right font-semibold text-sm">{formatCurrency(item.priceNetto)}</TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge variant="outline" className="text-xs px-1.5 py-0">{item.vatRate}%</Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              {item.category && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category] ?? "bg-muted text-muted-foreground"}`}>
                                  {item.category}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              {existingItem && diff ? (
                                <div className="space-y-0.5">
                                  <div className="text-xs text-muted-foreground">Twoja: {formatCurrency(existingItem.priceNettoPerUnit)}</div>
                                  <div className={`flex items-center gap-1 text-xs font-semibold ${diff === "cheaper" ? "text-emerald-600 dark:text-emerald-400" : diff === "more_expensive" ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
                                    {diff === "cheaper" && <><TrendingDown className="h-3 w-3" />API taniej</>}
                                    {diff === "more_expensive" && <><TrendingUp className="h-3 w-3" />API drożej</>}
                                    {diff === "equal" && <><Minus className="h-3 w-3" />Taka sama</>}
                                  </div>
                                  {onApplyPriceToItem && diff !== "equal" && (
                                    <button onClick={() => onApplyPriceToItem(existingItem.id, item.priceNetto, result.source)} className="text-xs text-primary hover:underline">
                                      Zastosuj cenę API
                                    </button>
                                  )}
                                </div>
                              ) : <span className="text-xs text-muted-foreground/50">—</span>}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <Button
                                size="sm"
                                variant={isAdded ? "outline" : "default"}
                                className={isAdded ? "h-7 text-xs border-emerald-400 text-emerald-600 dark:text-emerald-400" : "btn-primary h-7 text-xs"}
                                onClick={() => !isAdded && handleAddItem(item, idx)}
                                disabled={isAdded}
                              >
                                {isAdded ? <><Check className="h-3 w-3" />Dodano</> : <><Plus className="h-3 w-3" />Dodaj</>}
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
              {filteredItems.length === 0 && filterText && (
                <p className="text-center text-sm text-muted-foreground py-4">Brak wyników dla &ldquo;{filterText}&rdquo;</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {result && !result.error && result.items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Database className="h-8 w-8 opacity-30" />
            <p className="text-sm">Brak wyników dla podanego zapytania</p>
          </motion.div>
        )}

        {!result && !loading && (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Globe className="h-8 w-8 opacity-20" />
            <p className="text-sm">Wybierz źródło i kliknij &ldquo;Pobierz ceny&rdquo;</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
