"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useSettingsStore } from "@/store/settings-store";
import type { QuoteItem, VatRate, Unit, QuoteStatus, QuoteAdditionalCost } from "@/types";
import { VAT_RATE_LABELS, UNIT_LABELS } from "@/types";
import {
  calcQuoteItem, calcQuoteTotals, calcAdditionalCostsTotal,
  calcTotalBrutto, formatCurrency, round,
} from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Zap, ArrowLeft, Users, Plus, Trash2, Search, RefreshCw,
  Cable, CircuitBoard, Lightbulb, Power, Plug, Wrench,
  Calculator, FileText, Package, Copy, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Info, Loader2, Edit2, Save,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion, AnimatePresence } from "framer-motion";
import { ScrewRow, ElectricalBadge, CurrentIndicator, WireProgress } from "@/components/electrical-decorations";
import type { ElectricalPricingItem } from "@/app/api/pricing/electrical/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function makeItem(defaults: Partial<QuoteItem> = {}, vatRate: VatRate = 8): QuoteItem {
  return calcQuoteItem({
    id: genId(), name: "", quantity: 1, unit: "szt",
    priceNettoPerUnit: 0, vatRate, discountPercent: 0,
    nettotal: 0, vatAmount: 0, bruttoTotal: 0,
    ...defaults,
  });
}

function makeCost(): QuoteAdditionalCost {
  return { id: genId(), name: "", amount: 0, vatRate: 23, category: "inne" };
}

// ─── Kategorie ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "gniazda",     label: "Gniazda/Wyłączniki", icon: Plug,         color: "from-teal-500 to-cyan-600" },
  { id: "oswietlenie", label: "Oświetlenie",         icon: Lightbulb,    color: "from-purple-500 to-violet-600" },
  { id: "instalacja",  label: "Instalacja",          icon: Cable,        color: "from-amber-500 to-yellow-600" },
  { id: "rozdzielnia", label: "Rozdzielnie",         icon: Power,        color: "from-blue-500 to-indigo-600" },
  { id: "pomiar",      label: "Pomiary",             icon: CircuitBoard, color: "from-green-500 to-emerald-600" },
  { id: "naprawa",     label: "Naprawa/Awarie",      icon: Wrench,       color: "from-orange-500 to-red-600" },
  { id: "robocizna",   label: "Robocizna",           icon: Zap,          color: "from-yellow-500 to-amber-600" },
];

// ─── Kalkulator elektryczny ───────────────────────────────────────────────────

interface ElectricalCalcResult {
  laborCost: number;
  materialEstimate: number;
  totalNetto: number;
  totalBrutto: number;
  laborHours: number;
  recommendation: string;
}

function calcElectricalEstimate(items: QuoteItem[], laborRate: number): ElectricalCalcResult {
  const laborCost = round(items.reduce((s, i) => s + i.nettotal, 0));
  const materialEstimate = round(laborCost * 0.3); // ~30% materiały
  const totalNetto = round(laborCost + materialEstimate);
  const totalBrutto = round(totalNetto * 1.08);
  const laborHours = round(laborCost / laborRate);

  let recommendation = "";
  if (totalBrutto > 10000) recommendation = "Duży projekt — rozważ etapowanie i harmonogram";
  else if (totalBrutto > 3000) recommendation = "Średni projekt — warto dodać rezerwę 10%";
  else recommendation = "Mały projekt — standardowa wycena";

  return { laborCost, materialEstimate, totalNetto, totalBrutto, laborHours, recommendation };
}

// ─── Komponent cennika (edytowalny) ──────────────────────────────────────────

function PricelistRow({
  item,
  onEdit,
  onAdd,
}: {
  item: ElectricalPricingItem;
  onEdit: (id: string, price: number) => void;
  onAdd: (item: ElectricalPricingItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(item.priceNetto);
  const cat = CATEGORIES.find((c) => c.id === item.category);

  return (
    <motion.tr
      layout
      className="border-b border-border/50 hover:bg-accent/30 transition-colors"
    >
      <td className="py-2.5 px-3">
        <div className="font-medium text-sm">{item.name}</div>
        {item.description && (
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</div>
        )}
        {item.norm && <span className="text-[10px] text-muted-foreground/60">{item.norm}</span>}
      </td>
      <td className="py-2.5 px-2 text-center">
        {cat && <ElectricalBadge>{cat.label}</ElectricalBadge>}
      </td>
      <td className="py-2.5 px-2 text-center text-xs text-muted-foreground">{item.unit}</td>
      <td className="py-2.5 px-2 text-right">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <Input
              type="number" min="0" step="1"
              value={editPrice}
              onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
              className="h-7 w-24 text-right text-xs"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
              onClick={() => { onEdit(item.id, editPrice); setEditing(false); }}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 justify-end">
            <span className="font-semibold text-sm">{formatCurrency(item.priceNetto)}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-50 hover:opacity-100"
              onClick={() => { setEditPrice(item.priceNetto); setEditing(true); }}>
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="text-[10px] text-muted-foreground">
          {formatCurrency(item.priceMin)}–{formatCurrency(item.priceMax)}
        </div>
      </td>
      <td className="py-2.5 px-2 text-center text-xs">{item.vatRate}%</td>
      {item.laborMinutes && item.laborMinutes > 0 ? (
        <td className="py-2.5 px-2 text-center text-xs text-muted-foreground">
          {item.laborMinutes >= 60
            ? `${Math.floor(item.laborMinutes / 60)}h${item.laborMinutes % 60 > 0 ? ` ${item.laborMinutes % 60}m` : ""}`
            : `${item.laborMinutes}m`}
        </td>
      ) : (
        <td className="py-2.5 px-2 text-center text-xs text-muted-foreground">—</td>
      )}
      <td className="py-2.5 px-2">
        <Button size="sm" className="h-7 text-xs btn-switch" onClick={() => onAdd(item)}>
          <Plus className="h-3 w-3 mr-1" /> Dodaj
        </Button>
      </td>
    </motion.tr>
  );
}

// ─── Główna strona ────────────────────────────────────────────────────────────

export default function NowaWycenaElektrycznaPage() {
  const router = useRouter();
  const clients = useClientStore((s) => s.clients);
  const settings = useSettingsStore((s) => s.settings);
  const addQuote = useQuoteStore((s) => s.add);

  // ── Dane klienta ──────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNip, setClientNip] = useState("");

  // ── Pozycje wyceny ────────────────────────────────────────────────────────
  const [items, setItems] = useState<QuoteItem[]>([makeItem({}, settings?.defaultVatRate || 8)]);
  const [additionalCosts, setAdditionalCosts] = useState<QuoteAdditionalCost[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  // ── Cennik API ────────────────────────────────────────────────────────────
  const [pricelist, setPricelist] = useState<ElectricalPricingItem[]>([]);
  const [pricelistLoading, setPricelistLoading] = useState(false);
  const [pricelistError, setPricelistError] = useState("");
  const [pricelistSearch, setPricelistSearch] = useState("");
  const [pricelistCategory, setPricelistCategory] = useState("all");
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [pricelistOpen, setPricelistOpen] = useState(false);

  // ── Kalkulator ────────────────────────────────────────────────────────────
  const [laborRate, setLaborRate] = useState(130);
  const [activeTab, setActiveTab] = useState("items");

  // ── Pobierz cennik z API ──────────────────────────────────────────────────
  const fetchPricelist = useCallback(async (query = "", category = "all") => {
    setPricelistLoading(true);
    setPricelistError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/pricing/electrical?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPricelist(data.items || []);
    } catch (err) {
      setPricelistError("Błąd pobierania cennika. Sprawdź połączenie.");
      toast.error("Nie udało się pobrać cennika");
    } finally {
      setPricelistLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricelist();
  }, [fetchPricelist]);

  // ── Filtrowanie cennika ───────────────────────────────────────────────────
  const filteredPricelist = useMemo(() => {
    let list = pricelist.map((item) => ({
      ...item,
      priceNetto: customPrices[item.id] ?? item.priceNetto,
    }));
    if (pricelistCategory !== "all") {
      list = list.filter((i) => i.category === pricelistCategory);
    }
    if (pricelistSearch) {
      const q = pricelistSearch.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [pricelist, customPrices, pricelistCategory, pricelistSearch]);

  // ── Edycja ceny w cenniku ─────────────────────────────────────────────────
  function handleEditPrice(id: string, price: number) {
    setCustomPrices((prev) => ({ ...prev, [id]: price }));
    toast.success("Cena zaktualizowana w cenniku");
  }

  // ── Dodaj z cennika do wyceny ─────────────────────────────────────────────
  function addFromPricelist(priceItem: ElectricalPricingItem) {
    const price = customPrices[priceItem.id] ?? priceItem.priceNetto;
    const newItem = makeItem({
      name: priceItem.name,
      unit: priceItem.unit as Unit,
      priceNettoPerUnit: price,
      vatRate: priceItem.vatRate as VatRate,
    });
    setItems((prev) => {
      const empty = prev.filter((i) => i.name === "" && i.priceNettoPerUnit === 0);
      const nonEmpty = prev.filter((i) => i.name !== "" || i.priceNettoPerUnit > 0);
      return [...nonEmpty, newItem, ...(empty.length > 0 ? [] : [])];
    });
    toast.success(`Dodano: ${priceItem.name}`);
  }

  // ── Klient ────────────────────────────────────────────────────────────────
  function handleClientSelect(clientId: string) {
    if (!clientId || clientId === "none") {
      setSelectedClientId(null);
      setClientName(""); setClientAddress(""); setClientPhone(""); setClientEmail(""); setClientNip("");
      return;
    }
    const client = clients.find((c) => c.id === parseInt(clientId));
    if (client) {
      setSelectedClientId(client.id!);
      setClientName(client.name); setClientAddress(client.address || "");
      setClientPhone(client.phone); setClientEmail(client.email || ""); setClientNip(client.nip || "");
    }
  }

  // ── Pozycje ───────────────────────────────────────────────────────────────
  function updateItem(id: string, updates: Partial<QuoteItem>) {
    setItems((prev) => prev.map((i) => i.id !== id ? i : calcQuoteItem({ ...i, ...updates })));
  }
  function removeItem(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)); }
  function copyItem(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: genId(), name: `${prev[idx].name} (kopia)` };
      const next = [...prev]; next.splice(idx + 1, 0, copy); return next;
    });
  }

  // ── Koszty dodatkowe ──────────────────────────────────────────────────────
  function updateCost(id: string, updates: Partial<QuoteAdditionalCost>) {
    setAdditionalCosts((prev) => prev.map((c) => c.id !== id ? c : { ...c, ...updates }));
  }
  function removeCost(id: string) { setAdditionalCosts((prev) => prev.filter((c) => c.id !== id)); }

  // ── Sumy ─────────────────────────────────────────────────────────────────
  const totals = useMemo(() => calcQuoteTotals(items, additionalCosts, globalDiscount), [items, additionalCosts, globalDiscount]);
  const estimate = useMemo(() => calcElectricalEstimate(items, laborRate), [items, laborRate]);

  // ── Zapis ─────────────────────────────────────────────────────────────────
  async function handleSave(status: QuoteStatus = "szkic") {
    const validItems = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) { toast.error("Dodaj przynajmniej jedną pozycję"); return; }
    const recalc = validItems.map(calcQuoteItem);
    const validCosts = additionalCosts.filter((c) => c.name.trim());
    const t = calcQuoteTotals(recalc, validCosts, globalDiscount);

    const id = await addQuote({
      clientId: selectedClientId || undefined,
      clientName, clientAddress: clientAddress || undefined,
      clientPhone: clientPhone || undefined, clientEmail: clientEmail || undefined,
      clientNip: clientNip || undefined,
      items: recalc, additionalCosts: validCosts,
      progressiveDiscounts: [],
      globalDiscountPercent: globalDiscount,
      notes: notes || undefined, status,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      totalNetto: t.totalNetto, totalVat: t.totalVat, totalBrutto: t.totalBrutto,
    });
    toast.success(status === "szkic" ? "Zapisano jako szkic" : "Wycena elektryczna utworzona");
    router.push(`/wyceny/${id}`);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <StaggerContainer className="space-y-5 max-w-5xl mx-auto">

        {/* Header */}
        <StaggerItem>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/elektryka")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-electrical flex items-center gap-2">
                <Zap className="h-7 w-7" style={{ color: "oklch(0.72 0.18 60)" }} />
                Nowa wycena elektryczna
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">Formularz z cennikiem elektrycznym i kalkulatorem</p>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem><CurrentIndicator active /></StaggerItem>

        {/* Klient */}
        <StaggerItem>
          <Card className="card-electrical">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" style={{ color: "oklch(0.72 0.18 60)" }} />
                Dane klienta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs mb-1 block">Wybierz z bazy</Label>
                <Select onValueChange={(v) => handleClientSelect(v ?? "none")} value={selectedClientId ? String(selectedClientId) : "none"}>
                  <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nowy klient</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label className="text-xs">Nazwa klienta</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Imię i nazwisko / Firma" className="mt-1" /></div>
                <div><Label className="text-xs">Telefon</Label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Numer telefonu" className="mt-1" /></div>
                <div><Label className="text-xs">Email</Label>
                  <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" className="mt-1" /></div>
                <div><Label className="text-xs">NIP</Label>
                  <Input value={clientNip} onChange={(e) => setClientNip(e.target.value)} placeholder="NIP (opcjonalnie)" className="mt-1" /></div>
              </div>
              <div><Label className="text-xs">Adres</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Adres realizacji" className="mt-1" /></div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Cennik + Pozycje */}
        <StaggerItem>
          <Card className="card-electrical">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" style={{ color: "oklch(0.72 0.18 60)" }} />
                    Pozycje wyceny
                  </CardTitle>
                  <TabsList>
                    <TabsTrigger value="items">Pozycje ({items.filter(i => i.name).length})</TabsTrigger>
                    <TabsTrigger value="cennik">Cennik API</TabsTrigger>
                    <TabsTrigger value="koszty">Koszty ({additionalCosts.length})</TabsTrigger>
                    <TabsTrigger value="kalkulator">Kalkulator</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              {/* ── Pozycje ── */}
              <TabsContent value="items">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="btn-switch text-xs"
                      onClick={() => { setActiveTab("cennik"); setPricelistOpen(true); }}>
                      <Zap className="h-3.5 w-3.5 mr-1" /> Z cennika elektrycznego
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, makeItem({}, settings?.defaultVatRate || 8)])}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Ręcznie
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      <Zap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      Brak pozycji — dodaj z cennika lub ręcznie
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {items.map((item, idx) => (
                          <motion.div key={item.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="rounded-xl border border-border/60 p-3 bg-accent/20 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-muted-foreground w-5 pt-2 shrink-0">{idx + 1}.</span>
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="sm:col-span-2">
                                  <Input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                    placeholder="Nazwa usługi / pozycji" className="h-9 font-medium" />
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Ilość</Label>
                                    <Input type="number" min="0.01" step="0.01" value={item.quantity}
                                      onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 1 })}
                                      className="h-8 text-sm" />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Jedn.</Label>
                                    <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: v as Unit })}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">VAT</Label>
                                    <Select value={String(item.vatRate)} onValueChange={(v) => updateItem(item.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Cena netto/jedn.</Label>
                                    <Input type="number" min="0" step="0.01" value={item.priceNettoPerUnit}
                                      onChange={(e) => updateItem(item.id, { priceNettoPerUnit: parseFloat(e.target.value) || 0 })}
                                      className="h-8 text-sm" />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground">Rabat %</Label>
                                    <Input type="number" min="0" max="100" step="1" value={item.discountPercent}
                                      onChange={(e) => updateItem(item.id, { discountPercent: parseFloat(e.target.value) || 0 })}
                                      className="h-8 text-sm" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="text-right">
                                  <div className="font-bold text-sm" style={{ color: "oklch(0.72 0.18 60)" }}>{formatCurrency(item.bruttoTotal)}</div>
                                  <div className="text-[10px] text-muted-foreground">brutto</div>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => copyItem(item.id)}>
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              {/* ── Cennik API ── */}
              <TabsContent value="cennik">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Szukaj w cenniku..." value={pricelistSearch}
                        onChange={(e) => setPricelistSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={pricelistCategory} onValueChange={(v) => setPricelistCategory(v ?? "all")}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Kategoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie kategorie</SelectItem>
                        {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => fetchPricelist(pricelistSearch, pricelistCategory)}
                      disabled={pricelistLoading}>
                      {pricelistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>

                  {pricelistError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {pricelistError}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Kliknij <Edit2 className="h-3 w-3 inline" /> aby edytować cenę. Zmiany są lokalne.
                    Znaleziono: <strong>{filteredPricelist.length}</strong> pozycji
                  </div>

                  {pricelistLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" /> Pobieranie cennika...
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-accent/30 text-muted-foreground text-xs">
                            <th className="text-left py-2 px-3 font-medium">Usługa</th>
                            <th className="text-center py-2 px-2 font-medium">Kat.</th>
                            <th className="text-center py-2 px-2 font-medium">Jedn.</th>
                            <th className="text-right py-2 px-2 font-medium">Cena netto</th>
                            <th className="text-center py-2 px-2 font-medium">VAT</th>
                            <th className="text-center py-2 px-2 font-medium">Czas</th>
                            <th className="py-2 px-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPricelist.map((item) => (
                            <PricelistRow key={item.id} item={item} onEdit={handleEditPrice} onAdd={addFromPricelist} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              {/* ── Koszty dodatkowe ── */}
              <TabsContent value="koszty">
                <CardContent className="pt-4 space-y-3">
                  <Button variant="outline" size="sm" onClick={() => setAdditionalCosts((p) => [...p, makeCost()])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Dodaj koszt
                  </Button>
                  {additionalCosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak kosztów dodatkowych</div>
                  ) : (
                    <div className="space-y-2">
                      {additionalCosts.map((cost) => (
                        <div key={cost.id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
                          <Input value={cost.name} onChange={(e) => updateCost(cost.id, { name: e.target.value })}
                            placeholder="Nazwa kosztu" className="h-8 flex-1" />
                          <Select value={cost.category} onValueChange={(v) => updateCost(cost.id, { category: v as QuoteAdditionalCost["category"] })}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dojazd">Dojazd</SelectItem>
                              <SelectItem value="materialy">Materiały</SelectItem>
                              <SelectItem value="sprzet">Sprzęt</SelectItem>
                              <SelectItem value="inne">Inne</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" min="0" step="0.01" value={cost.amount}
                            onChange={(e) => updateCost(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-28 text-right" />
                          <Select value={String(cost.vatRate)} onValueChange={(v) => updateCost(cost.id, { vatRate: parseInt(v ?? "23") as VatRate })}>
                            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeCost(cost.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              {/* ── Kalkulator ── */}
              <TabsContent value="kalkulator">
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <Card className="card-panel">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Parametry kalkulacji</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Stawka robocizny (PLN/godz)</Label>
                          <Input type="number" min="50" max="500" step="10" value={laborRate}
                            onChange={(e) => setLaborRate(parseFloat(e.target.value) || 130)}
                            className="mt-1 h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">Rabat globalny (%)</Label>
                          <Input type="number" min="0" max="50" step="1" value={globalDiscount}
                            onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                            className="mt-1 h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">Ważność wyceny</Label>
                          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 h-9" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-panel">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Szacunek projektu</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Robocizna (netto):</span>
                          <span className="font-bold">{formatCurrency(estimate.laborCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Materiały (~30%):</span>
                          <span className="font-semibold">{formatCurrency(estimate.materialEstimate)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Razem netto:</span>
                          <span className="font-bold">{formatCurrency(estimate.totalNetto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Razem brutto:</span>
                          <span className="font-black text-base" style={{ color: "oklch(0.72 0.18 60)" }}>{formatCurrency(estimate.totalBrutto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Szac. czas pracy:</span>
                          <span className="font-semibold">{estimate.laborHours} godz.</span>
                        </div>
                        <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                          <Info className="h-3 w-3 inline mr-1" />{estimate.recommendation}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Label className="text-xs">Uwagi do wyceny</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Dodatkowe informacje, warunki, zakres prac..." rows={3} className="mt-1" />
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </StaggerItem>

        {/* Podsumowanie + Zapis */}
        <StaggerItem>
          <Card className="card-electrical">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <ScrewRow>Podsumowanie</ScrewRow>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Netto</div>
                      <div className="font-bold">{formatCurrency(totals.totalNetto)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">VAT</div>
                      <div className="font-bold">{formatCurrency(totals.totalVat)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Brutto</div>
                      <div className="font-black text-lg" style={{ color: "oklch(0.72 0.18 60)" }}>
                        {formatCurrency(totals.totalBrutto)}
                      </div>
                    </div>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="text-xs text-green-600">Rabat: -{formatCurrency(totals.discountAmount)}</div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => handleSave("szkic")}>
                    <FileText className="h-4 w-4 mr-1" /> Zapisz szkic
                  </Button>
                  <Button className="btn-switch" onClick={() => handleSave("wyslana")}>
                    <Zap className="h-4 w-4 mr-1" /> Utwórz wycenę
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem><CurrentIndicator active /></StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
