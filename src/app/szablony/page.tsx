"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/store/template-store";
import { useQuoteStore } from "@/store/quote-store";
import { useServiceStore } from "@/store/service-store";
import { useMaterialStore } from "@/store/material-store";
import { quoteTemplateSchema } from "@/lib/validators";
import { UNIT_LABELS, VAT_RATE_LABELS, DEFAULT_PRICING_MODEL, type VatRate, type Unit, type QuoteItem, type QuoteAdditionalCost, type PricingModelConfig } from "@/types";
import { formatCurrency, calcQuoteItem, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Pencil, Trash2, Search, ClipboardList, FileText, Package,
  Copy, Download, Upload, Eye, Star, TrendingUp, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { BoltRow, PipeSeparator, HydraulicBadge, FlowIndicator } from "@/components/hydraulic-decorations";

function generateItemId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
function createEmptyItem(vat: VatRate = 8): QuoteItem {
  return calcQuoteItem({ id: generateItemId(), name: "", quantity: 1, unit: "szt", priceNettoPerUnit: 0, vatRate: vat, discountPercent: 0, nettotal: 0, vatAmount: 0, bruttoTotal: 0 });
}
function createEmptyCost(): QuoteAdditionalCost {
  return { id: generateItemId(), name: "", amount: 0, vatRate: 8, category: "inne" };
}

type SortKey = "name" | "category" | "usageCount" | "updatedAt";
type SortDir = "asc" | "desc";

const EMPTY_FORM = { name: "", description: "", category: "", defaultDiscountPercent: 0 };

export default function SzablonyPage() {
  const router = useRouter();
  const templates = useTemplateStore((s) => s.templates);
  const loading = useTemplateStore((s) => s.loading);
  const search = useTemplateStore((s) => s.search);
  const categoryFilter = useTemplateStore((s) => s.categoryFilter);
  const setSearch = useTemplateStore((s) => s.setSearch);
  const setCategoryFilter = useTemplateStore((s) => s.setCategoryFilter);
  const add = useTemplateStore((s) => s.add);
  const update = useTemplateStore((s) => s.update);
  const remove = useTemplateStore((s) => s.remove);
  const duplicateTemplate = useTemplateStore((s) => s.duplicate);
  const incrementUsage = useTemplateStore((s) => s.incrementUsage);
  const services = useServiceStore((s) => s.services);
  const materials = useMaterialStore((s) => s.materials);
  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateItems, setTemplateItems] = useState<QuoteItem[]>([]);
  const [templateCosts, setTemplateCosts] = useState<QuoteAdditionalCost[]>([]);
  const [pricingModel, setPricingModel] = useState<PricingModelConfig>(DEFAULT_PRICING_MODEL);
  const [activeTab, setActiveTab] = useState("basic");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ─── Statystyki szablonów ───────────────────────────────────────────────
  const templateStats = useMemo(() => {
    const stats: Record<number, { quoteCount: number; revenue: number }> = {};
    quotes.forEach((q) => {
      if (q.templateId) {
        if (!stats[q.templateId]) stats[q.templateId] = { quoteCount: 0, revenue: 0 };
        stats[q.templateId].quoteCount += 1;
        if (q.status === "zaakceptowana") stats[q.templateId].revenue += q.totalBrutto;
      }
    });
    return stats;
  }, [quotes]);

  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))].filter(Boolean), [templates]);

  // ─── Filtrowanie i sortowanie ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = templates.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "usageCount": cmp = a.usageCount - b.usageCount; break;
        case "updatedAt": cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [templates, search, categoryFilter, sortKey, sortDir]);

  // ─── CRUD ──────────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null); setForm(EMPTY_FORM); setErrors({});
    setTemplateItems([]); setTemplateCosts([]); setPricingModel(DEFAULT_PRICING_MODEL);
    setActiveTab("basic"); setDialogOpen(true);
  }

  function openEdit(id: number) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setForm({ name: t.name, description: t.description || "", category: t.category, defaultDiscountPercent: t.defaultDiscountPercent });
    setTemplateItems(t.items || []);
    setTemplateCosts(t.additionalCosts || []);
    setPricingModel(t.pricingModel || DEFAULT_PRICING_MODEL);
    setErrors({}); setActiveTab("basic"); setDialogOpen(true);
  }

  function handleSave() {
    const result = quoteTemplateSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as string] = issue.message; });
      setErrors(fieldErrors); return;
    }
    const data = { ...result.data, items: templateItems, additionalCosts: templateCosts, pricingModel };
    if (editingId) { update(editingId, data); toast.success("Szablon zaktualizowany"); }
    else { add(data); toast.success("Szablon dodany"); }
    setDialogOpen(false);
  }

  function handleDuplicate(id: number) { duplicateTemplate(id); toast.success("Szablon zduplikowany"); }

  function handleUseTemplate(id: number) {
    incrementUsage(id);
    router.push(`/wyceny/nowa?templateId=${id}`);
  }

  // ─── Eksport/Import ────────────────────────────────────────────────────
  function handleExportAll() {
    const data = JSON.stringify(templates, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `szablony-wycenka-${format(new Date(), "yyyy-MM-dd")}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Wyeksportowano ${templates.length} szablonów`);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const items = Array.isArray(data) ? data : [data];
        let imported = 0;
        for (const item of items) {
          if (item.name && item.category) {
            await add({ name: item.name, description: item.description || "", category: item.category, defaultDiscountPercent: item.defaultDiscountPercent || 0, items: item.items || [], additionalCosts: item.additionalCosts || [], pricingModel: item.pricingModel });
            imported++;
          }
        }
        toast.success(`Zaimportowano ${imported} szablonów`);
      } catch { toast.error("Błąd importu — nieprawidłowy format JSON"); }
    };
    reader.readAsText(file);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────
  function updateItem(id: string, updates: Partial<QuoteItem>) {
    setTemplateItems((prev) => prev.map((item) => item.id === id ? calcQuoteItem({ ...item, ...updates }) : item));
  }
  function addServiceToTemplate(serviceId: number) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setTemplateItems((prev) => [...prev, calcQuoteItem({ id: generateItemId(), serviceId: service.id, name: service.name, quantity: 1, unit: service.unit, priceNettoPerUnit: service.priceNetto, vatRate: service.vatRate, discountPercent: 0, nettotal: 0, vatAmount: 0, bruttoTotal: 0 })]);
  }

  const templateTotalNetto = templateItems.reduce((s, i) => s + i.nettotal, 0);
  const templateTotalBrutto = templateItems.reduce((s, i) => s + i.bruttoTotal, 0);
  const previewTemplate = previewId ? templates.find((t) => t.id === previewId) : null;

  return (
    <PageTransition>
      <StaggerContainer className="space-y-5">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe section-industrial">Szablony wycen</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">{templates.length} szablonów · {categories.length} kategorii</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="btn-secondary" onClick={handleExportAll}>
                <Download className="h-4 w-4" /><span className="hidden sm:inline">Eksport</span>
              </Button>
              <label className="cursor-pointer">
                <span className="btn-secondary inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm">
                  <Upload className="h-4 w-4" /><span className="hidden sm:inline">Import</span>
                </span>
                <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
              </label>
              <Button className="btn-primary" onClick={openAdd}>
                <Plus className="h-4 w-4" />Nowy szablon
              </Button>
            </div>
          </div>
        </StaggerItem>

        {/* Filtry + sortowanie */}
        <StaggerItem>
          <BoltRow>Katalog szablonów</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <Card className="card-steel">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Szukaj szablonów..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie ({templates.length})</SelectItem>
                    {categories.map((cat) => {
                      const count = templates.filter((t) => t.category === cat).length;
                      return <SelectItem key={cat} value={cat}>{cat} ({count})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={`${sortKey}-${sortDir}`} onValueChange={(v) => { const [k, d] = (v ?? "name-asc").split("-"); setSortKey(k as SortKey); setSortDir(d as SortDir); }}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Nazwa A→Z</SelectItem>
                    <SelectItem value="name-desc">Nazwa Z→A</SelectItem>
                    <SelectItem value="usageCount-desc">Najpopularniejsze</SelectItem>
                    <SelectItem value="updatedAt-desc">Ostatnio zmienione</SelectItem>
                    <SelectItem value="category-asc">Kategoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <TableSkeleton rows={4} /> : filtered.length === 0 ? (
                <AnimatedEmptyState
                  icon={ClipboardList}
                  title={templates.length === 0 ? "Brak szablonów" : "Brak wyników"}
                  description={templates.length === 0 ? "Utwórz pierwszy szablon wyceny" : "Zmień kryteria wyszukiwania"}
                  action={templates.length === 0 ? <Button className="btn-primary" onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Nowy szablon</Button> : undefined}
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {filtered.map((t, i) => {
                      const stats = templateStats[t.id!];
                      const totalValue = (t.items || []).reduce((s, item) => s + item.bruttoTotal, 0);
                      return (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ delay: Math.min(i * 0.04, 0.3) }}
                        >
                          <Card className="card-steel group h-full flex flex-col hover:-translate-y-0.5 transition-transform duration-200">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-sm truncate">{t.name}</CardTitle>
                                  {t.description && <CardDescription className="line-clamp-2 mt-0.5">{t.description}</CardDescription>}
                                </div>
                                <HydraulicBadge>{t.category}</HydraulicBadge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                              {/* Statystyki */}
                              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                <div>
                                  <div className="text-sm font-bold">{(t.items || []).length}</div>
                                  <div className="text-[9px] text-muted-foreground">Pozycji</div>
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{t.usageCount}</div>
                                  <div className="text-[9px] text-muted-foreground">Użyć</div>
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-primary">{formatCurrency(totalValue)}</div>
                                  <div className="text-[9px] text-muted-foreground">Wartość</div>
                                </div>
                              </div>

                              {/* Przychód z szablonu */}
                              {stats && stats.revenue > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 mb-3">
                                  <TrendingUp className="h-3 w-3" />
                                  {formatCurrency(stats.revenue)} przychodu z {stats.quoteCount} wycen
                                </div>
                              )}

                              {/* Akcje */}
                              <div className="flex gap-1.5">
                                <Button className="btn-primary flex-1 h-8 text-xs" onClick={() => handleUseTemplate(t.id!)}>
                                  <FileText className="h-3.5 w-3.5" />Użyj
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewId(t.id!)} title="Podgląd">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t.id!)} title="Edytuj">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(t.id!)} title="Duplikuj">
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Usuń szablon</AlertDialogTitle><AlertDialogDescription>Usunąć &ldquo;{t.name}&rdquo;?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={() => { remove(t.id!); toast.success("Usunięto"); }}>Usuń</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <FlowIndicator active />
        </StaggerItem>
      </StaggerContainer>

      {/* ── Dialog podglądu ── */}
      <Dialog open={previewId !== null} onOpenChange={(open) => { if (!open) setPreviewId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {previewTemplate.name}
                  <Badge variant="outline">{previewTemplate.category}</Badge>
                </DialogTitle>
              </DialogHeader>
              {previewTemplate.description && <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>}
              <Separator />
              {previewTemplate.items && previewTemplate.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Pozycje ({previewTemplate.items.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa</TableHead>
                        <TableHead className="text-center">Ilość</TableHead>
                        <TableHead>Jedn.</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Brutto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewTemplate.items.map((item, idx) => (
                        <TableRow key={item.id || idx}>
                          <TableCell className="text-sm font-medium">{item.name}</TableCell>
                          <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-sm">{UNIT_LABELS[item.unit]}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(item.nettotal)}</TableCell>
                          <TableCell className="text-right text-sm font-bold text-primary">{formatCurrency(item.bruttoTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-2 text-sm font-bold">
                    Suma: {formatCurrency(previewTemplate.items.reduce((s, i) => s + i.bruttoTotal, 0))}
                  </div>
                </div>
              )}
              {previewTemplate.additionalCosts && previewTemplate.additionalCosts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Koszty dodatkowe</h4>
                  {previewTemplate.additionalCosts.map((c) => (
                    <div key={c.id} className="flex justify-between text-sm py-1">
                      <span>{c.name}</span>
                      <span className="font-semibold">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                <span>Użyto: {previewTemplate.usageCount}x</span>
                <span>Zmieniono: {format(new Date(previewTemplate.updatedAt), "dd.MM.yyyy", { locale: pl })}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog dodawania/edycji ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edytuj szablon" : "Nowy szablon"}</DialogTitle></DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Podstawowe</TabsTrigger>
              <TabsTrigger value="items">Pozycje ({templateItems.length})</TabsTrigger>
              <TabsTrigger value="costs">Koszty ({templateCosts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label>Nazwa szablonu</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Kategoria</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="np. Łazienka, Kuchnia" />
                  {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Domyślny rabat (%)</Label>
                  <Input type="number" min="0" max="100" value={form.defaultDiscountPercent} onChange={(e) => setForm({ ...form, defaultDiscountPercent: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Opis</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Opis szablonu..." />
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="btn-secondary" onClick={() => setTemplateItems((p) => [...p, createEmptyItem()])}>
                  <Plus className="h-3.5 w-3.5" />Ręcznie
                </Button>
                {services.length > 0 && (
                  <Select onValueChange={(v) => { if (v) addServiceToTemplate(parseInt(String(v))); }}>
                    <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="+ Z katalogu usług" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({formatCurrency(s.priceNetto)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {templateItems.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">Brak pozycji</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-40">Nazwa</TableHead>
                        <TableHead className="w-16">Ilość</TableHead>
                        <TableHead className="w-20">Jedn.</TableHead>
                        <TableHead className="w-24">Cena</TableHead>
                        <TableHead className="w-16">VAT</TableHead>
                        <TableHead className="text-right w-24">Brutto</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell><Input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="h-8 text-sm" /></TableCell>
                          <TableCell><Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" /></TableCell>
                          <TableCell>
                            <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: (v ?? "szt") as Unit })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input type="number" min="0" step="0.01" value={item.priceNettoPerUnit} onChange={(e) => updateItem(item.id, { priceNettoPerUnit: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" /></TableCell>
                          <TableCell>
                            <Select value={String(item.vatRate)} onValueChange={(v) => updateItem(item.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-primary">{formatCurrency(item.bruttoTotal)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setTemplateItems((p) => p.filter((i) => i.id !== item.id))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-2 text-sm font-bold">Suma brutto: {formatCurrency(templateTotalBrutto)}</div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="costs" className="space-y-4 mt-4">
              <Button variant="outline" size="sm" className="btn-secondary" onClick={() => setTemplateCosts((p) => [...p, createEmptyCost()])}>
                <Plus className="h-3.5 w-3.5" />Dodaj koszt
              </Button>
              {templateCosts.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">Brak kosztów dodatkowych</p>
              ) : (
                <div className="space-y-2">
                  {templateCosts.map((cost) => (
                    <div key={cost.id} className="grid grid-cols-[1fr_100px_80px_36px] gap-2 items-center">
                      <Input value={cost.name} onChange={(e) => setTemplateCosts((p) => p.map((c) => c.id === cost.id ? { ...c, name: e.target.value } : c))} className="h-8 text-sm" placeholder="Nazwa" />
                      <Input type="number" min="0" step="0.01" value={cost.amount} onChange={(e) => setTemplateCosts((p) => p.map((c) => c.id === cost.id ? { ...c, amount: parseFloat(e.target.value) || 0 } : c))} className="h-8 text-sm" />
                      <Select value={String(cost.vatRate)} onValueChange={(v) => setTemplateCosts((p) => p.map((c) => c.id === cost.id ? { ...c, vatRate: parseInt(v ?? "8") as VatRate } : c))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTemplateCosts((p) => p.filter((c) => c.id !== cost.id))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz" : "Dodaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
