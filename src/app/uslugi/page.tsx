"use client";

import { useState, useMemo } from "react";
import { useServiceStore } from "@/store/service-store";
import { useQuoteStore } from "@/store/quote-store";
import { useMaterialStore } from "@/store/material-store";
import { CATEGORY_LABELS, type ServiceCategory, type VatRate, VAT_RATE_LABELS, type Unit, UNIT_LABELS } from "@/types";
import { serviceSchema } from "@/lib/validators";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Pencil, Trash2, Search, Package, Copy, TrendingUp,
  Clock, BarChart3, Percent, Wrench, History, Link2,
  Calculator, DollarSign, ArrowUpRight, ArrowDownRight, Layers,
  CheckSquare, Square, Star, ExternalLink, LayoutGrid, List,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { BoltRow } from "@/components/hydraulic-decorations";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  montaz: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  naprawa: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wymiana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  czyszczenie: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  diagnoza: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  materialy: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  inne: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
};

const EMPTY_FORM = {
  name: "", category: "montaz" as ServiceCategory, unit: "szt" as Unit,
  priceNetto: 0, vatRate: 8 as VatRate, description: "",
  estimatedMinutes: 0, internalNotes: "", subcategory: "",
  priceMin: 0, priceMax: 0, costPrice: 0,
  relatedMaterialIds: [] as number[],
  variants: [] as { id: string; name: string; priceNetto: number; description?: string }[],
};

export default function UslugiPage() {
  const services = useServiceStore((s) => s.services);
  const loading = useServiceStore((s) => s.loading);
  const search = useServiceStore((s) => s.search);
  const categoryFilter = useServiceStore((s) => s.categoryFilter);
  const setSearch = useServiceStore((s) => s.setSearch);
  const setCategoryFilter = useServiceStore((s) => s.setCategoryFilter);
  const add = useServiceStore((s) => s.add);
  const update = useServiceStore((s) => s.update);
  const remove = useServiceStore((s) => s.remove);
  const duplicateService = useServiceStore((s) => s.duplicate);
  const bulkUpdatePrice = useServiceStore((s) => s.bulkUpdatePrice);
  const bulkUpdateCategory = useServiceStore((s) => s.bulkUpdateCategory);
  const bulkDelete = useServiceStore((s) => s.bulkDelete);
  const quotes = useQuoteStore((s) => s.quotes);
  const materials = useMaterialStore((s) => s.materials);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"price" | "category" | "delete">("price");
  const [bulkPercent, setBulkPercent] = useState(10);
  const [bulkCategory, setBulkCategory] = useState<ServiceCategory>("montaz");
  const [activeTab, setActiveTab] = useState("list");
  const [costCalcOpen, setCostCalcOpen] = useState(false);
  const [costCalcService, setCostCalcService] = useState<typeof services[0] | null>(null);
  const [viewMode, setViewMode] = useState<"auto" | "cards" | "table">("auto");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ─── Statystyki usług ───────────────────────────────────────────────────
  const serviceStats = useMemo(() => {
    const stats: Record<number, { usageCount: number; revenue: number; lastUsed?: Date }> = {};
    quotes.forEach((q) => {
      q.items.forEach((item) => {
        if (item.serviceId) {
          if (!stats[item.serviceId]) stats[item.serviceId] = { usageCount: 0, revenue: 0 };
          stats[item.serviceId].usageCount += 1;
          if (q.status === "zaakceptowana") stats[item.serviceId].revenue += item.bruttoTotal;
          const d = new Date(q.createdAt);
          if (!stats[item.serviceId].lastUsed || d > stats[item.serviceId].lastUsed!) stats[item.serviceId].lastUsed = d;
        }
      });
    });
    return stats;
  }, [quotes]);

  // ─── Analityka ─────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const totalServices = services.length;
    const activeServices = services.filter((s) => s.isActive !== false).length;
    const avgPrice = services.length > 0 ? round(services.reduce((s, sv) => s + sv.priceNetto, 0) / services.length) : 0;
    const totalRevenue = Object.values(serviceStats).reduce((s, st) => s + st.revenue, 0);
    const avgMargin = services.filter((s) => s.costPrice && s.costPrice > 0).length > 0
      ? round(services.filter((s) => s.costPrice && s.costPrice > 0).reduce((s, sv) => s + ((sv.priceNetto - (sv.costPrice || 0)) / sv.priceNetto) * 100, 0) / services.filter((s) => s.costPrice && s.costPrice > 0).length)
      : 0;

    // Category revenue
    const categoryRevenue: Record<string, number> = {};
    services.forEach((s) => {
      const stat = serviceStats[s.id!];
      if (stat) {
        categoryRevenue[s.category] = (categoryRevenue[s.category] || 0) + stat.revenue;
      }
    });
    const categoryData = Object.entries(categoryRevenue).map(([cat, rev]) => ({
      name: CATEGORY_LABELS[cat as ServiceCategory] || cat,
      revenue: round(rev),
    })).sort((a, b) => b.revenue - a.revenue);

    // Top services by usage
    const topByUsage = services
      .map((s) => ({ ...s, usage: serviceStats[s.id!]?.usageCount || 0, revenue: serviceStats[s.id!]?.revenue || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    // Price history trend (from services with priceHistory)
    const priceChanges: { date: string; avgPrice: number }[] = [];
    const allHistories = services.flatMap((s) => (s.priceHistory || []).map((h) => ({ ...h, serviceId: s.id })));
    const byMonth: Record<string, number[]> = {};
    allHistories.forEach((h) => {
      const month = format(new Date(h.date), "MMM yy", { locale: pl });
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(h.priceNetto);
    });
    Object.entries(byMonth).forEach(([month, prices]) => {
      priceChanges.push({ date: month, avgPrice: round(prices.reduce((s, p) => s + p, 0) / prices.length) });
    });

    // Unused services (never in a quote)
    const unusedServices = services.filter((s) => !serviceStats[s.id!]);

    return { totalServices, activeServices, avgPrice, totalRevenue, avgMargin, categoryData, topByUsage, priceChanges, unusedServices };
  }, [services, serviceStats]);

  // ─── Filtrowanie i paginacja ────────────────────────────────────────────
  const filtered = useMemo(() => services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.subcategory || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [services, search, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // ─── Selekcja ──────────────────────────────────────────────────────────
  function toggleSelect(id: number) { setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleSelectAll() { if (selectedIds.size === paginated.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paginated.map((s) => s.id!))); }

  // ─── CRUD ──────────────────────────────────────────────────────────────
  function openAdd() { setEditingId(null); setForm(EMPTY_FORM); setErrors({}); setDialogOpen(true); }

  function openEdit(id: number) {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setForm({
      name: s.name, category: s.category, unit: s.unit,
      priceNetto: s.priceNetto, vatRate: s.vatRate,
      description: s.description || "", estimatedMinutes: s.estimatedMinutes || 0,
      internalNotes: s.internalNotes || "", subcategory: s.subcategory || "",
      priceMin: s.priceMin || 0, priceMax: s.priceMax || 0, costPrice: s.costPrice || 0,
      relatedMaterialIds: s.relatedMaterialIds || [],
      variants: s.variants || [],
    });
    setErrors({});
    setDialogOpen(true);
  }

  function handleSave() {
    const result = serviceSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as string] = issue.message; });
      setErrors(fieldErrors);
      return;
    }
    const data = {
      ...result.data,
      estimatedMinutes: form.estimatedMinutes || undefined,
      internalNotes: form.internalNotes || undefined,
      subcategory: form.subcategory || undefined,
      priceMin: form.priceMin || undefined,
      priceMax: form.priceMax || undefined,
      costPrice: form.costPrice || undefined,
      relatedMaterialIds: form.relatedMaterialIds.length > 0 ? form.relatedMaterialIds : undefined,
      variants: form.variants.length > 0 ? form.variants : undefined,
    };
    if (editingId) { update(editingId, data); toast.success("Usługa zaktualizowana"); }
    else { add(data); toast.success("Usługa dodana"); }
    setDialogOpen(false);
  }

  function handleDuplicate(id: number) { duplicateService(id); toast.success("Usługa zduplikowana"); }

  // ─── Variants ──────────────────────────────────────────────────────────
  function addVariant() {
    setForm({ ...form, variants: [...form.variants, { id: crypto.randomUUID(), name: "", priceNetto: form.priceNetto, description: "" }] });
  }
  function removeVariant(id: string) {
    setForm({ ...form, variants: form.variants.filter((v) => v.id !== id) });
  }
  function updateVariant(id: string, field: string, value: string | number) {
    setForm({ ...form, variants: form.variants.map((v) => v.id === id ? { ...v, [field]: value } : v) });
  }

  // ─── Material linking ──────────────────────────────────────────────────
  function toggleMaterial(materialId: number) {
    const ids = form.relatedMaterialIds.includes(materialId)
      ? form.relatedMaterialIds.filter((id) => id !== materialId)
      : [...form.relatedMaterialIds, materialId];
    setForm({ ...form, relatedMaterialIds: ids });
  }

  // ─── Cost calculation ──────────────────────────────────────────────────
  function openCostCalc(s: typeof services[0]) { setCostCalcService(s); setCostCalcOpen(true); }
  function getCostBreakdown(s: typeof services[0]) {
    const linkedMaterials = (s.relatedMaterialIds || []).map((id) => materials.find((m) => m.id === id)).filter(Boolean);
    const materialCost = linkedMaterials.reduce((sum, m) => sum + (m?.purchasePrice || 0), 0);
    const laborCost = s.estimatedMinutes ? (s.estimatedMinutes / 60) * 100 : 0; // 100 PLN/h default
    const totalCost = materialCost + laborCost;
    const margin = s.priceNetto > 0 ? round(((s.priceNetto - totalCost) / s.priceNetto) * 100) : 0;
    return { materialCost: round(materialCost), laborCost: round(laborCost), totalCost: round(totalCost), margin, linkedMaterials };
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────
  function openBulkDialog(action: "price" | "category" | "delete") { setBulkAction(action); setBulkDialogOpen(true); }
  function executeBulkAction() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (bulkAction === "price") { bulkUpdatePrice(ids, bulkPercent); toast.success(`Ceny zmienione o ${bulkPercent > 0 ? "+" : ""}${bulkPercent}%`); }
    else if (bulkAction === "category") { bulkUpdateCategory(ids, bulkCategory); toast.success("Kategoria zmieniona"); }
    else if (bulkAction === "delete") { bulkDelete(ids); toast.success(`Usunięto ${ids.length} usług`); }
    setSelectedIds(new Set());
    setBulkDialogOpen(false);
  }

  function getMargin(s: typeof services[0]) {
    if (!s.costPrice || s.costPrice === 0) return null;
    return round(((s.priceNetto - s.costPrice) / s.priceNetto) * 100);
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-5">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe section-industrial">Katalog usług</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">{services.length} usług · {Object.keys(CATEGORY_LABELS).length} kategorii</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedIds.size > 0 && (
                <>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => openBulkDialog("price")}><Percent className="h-3.5 w-3.5 mr-1" />Ceny ({selectedIds.size})</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => openBulkDialog("category")}><Package className="h-3.5 w-3.5 mr-1" />Kategoria</Button>
                  <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => openBulkDialog("delete")}><Trash2 className="h-3.5 w-3.5 mr-1" />Usuń</Button>
                </>
              )}
              <Button className="btn-primary" onClick={openAdd}><Plus className="h-4 w-4" />Dodaj usługę</Button>
            </div>
          </div>
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerItem>
          <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="card-steel"><CardContent className="p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Usługi</div>
              <div className="text-xl font-black">{analytics.totalServices}</div>
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Śr. cena netto</div>
              <div className="text-lg font-black">{formatCurrency(analytics.avgPrice)}</div>
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Przychód łączny</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(analytics.totalRevenue)}</div>
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Śr. marża</div>
              <div className="text-lg font-black">{analytics.avgMargin}%</div>
            </CardContent></Card>
            <Card className="card-steel col-span-2 sm:col-span-1"><CardContent className="p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Nieużywane</div>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">{analytics.unusedServices.length}</div>
            </CardContent></Card>
          </div>
        </StaggerItem>

        {/* Tabs */}
        <StaggerItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Lista ({filtered.length})</TabsTrigger>
              <TabsTrigger value="analytics">Analityka</TabsTrigger>
              <TabsTrigger value="pricing">Cennik</TabsTrigger>
            </TabsList>

            {/* ── Lista ── */}
            <TabsContent value="list" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Szukaj usług..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter((v ?? "all") as ServiceCategory | "all")}>
                        <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Wszystkie ({services.length})</SelectItem>
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                            const count = services.filter((s) => s.category === key).length;
                            return <SelectItem key={key} value={key}>{label} ({count})</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>

                      {/* Przełącznik widoku: Karty vs Tabela */}
                      <div className="hidden sm:flex items-center rounded-lg border bg-muted/30 p-0.5">
                        <Button
                          variant={viewMode === "auto" || viewMode === "cards" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewMode("cards")}
                          title="Widok kafelkowy (Mobile/Karty)"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === "table" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewMode("table")}
                          title="Widok tabeli"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
                    <AnimatedEmptyState icon={Wrench} title={services.length === 0 ? "Brak usług" : "Brak wyników"} description={services.length === 0 ? "Dodaj pierwszą usługę" : "Zmień kryteria"} action={services.length === 0 ? <Button className="btn-primary" onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Dodaj usługę</Button> : undefined} />
                  ) : (
                    <>
                      {/* ── Widok mobilny / Kafelkowy ── */}
                      <div className={viewMode === "table" ? "hidden" : "grid gap-3 sm:hidden"}>
                        {paginated.map((s) => {
                          const stats = serviceStats[s.id!];
                          const margin = getMargin(s);
                          const hasVariants = s.variants && s.variants.length > 0;
                          const hasMaterials = s.relatedMaterialIds && s.relatedMaterialIds.length > 0;
                          const isSelected = selectedIds.has(s.id!);

                          return (
                            <div
                              key={s.id}
                              className={`p-3.5 rounded-xl border transition-all duration-200 bg-card ${
                                isSelected
                                  ? "border-primary/60 bg-primary/5 shadow-sm"
                                  : "border-border/60 hover:border-border"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelect(s.id!)}
                                    className="mt-1"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-sm text-foreground leading-snug">{s.name}</span>
                                      {hasVariants && <span title="Ma warianty"><Layers className="h-3.5 w-3.5 text-purple-500" /></span>}
                                      {hasMaterials && <span title="Powiązane materiały"><Link2 className="h-3.5 w-3.5 text-blue-500" /></span>}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <Badge className={`text-[10px] px-1.5 py-0.5 ${CATEGORY_COLORS[s.category]}`}>
                                        {CATEGORY_LABELS[s.category]}
                                      </Badge>
                                      {s.subcategory && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                          {s.subcategory}
                                        </Badge>
                                      )}
                                      {s.estimatedMinutes ? (
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                          <Clock className="h-3 w-3" />
                                          {s.estimatedMinutes} min
                                        </span>
                                      ) : null}
                                    </div>

                                    {s.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                        {s.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-base font-black text-foreground font-mono">
                                    {formatCurrency(s.priceNetto)}
                                  </div>
                                  <div className="text-[11px] font-semibold text-primary font-mono">
                                    {formatCurrency(s.priceNetto * (1 + s.vatRate / 100))} brutto
                                  </div>
                                  {margin !== null && (
                                    <div className={`text-[10px] font-bold ${margin >= 30 ? "text-emerald-600" : margin >= 15 ? "text-amber-600" : "text-red-500"}`}>
                                      marża {margin}%
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Pasek akcji mobilnych */}
                              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/40">
                                <div className="text-[11px] text-muted-foreground">
                                  Użyto: <strong className="text-foreground">{stats?.usageCount || 0}×</strong>
                                  {stats?.revenue ? ` (${formatCurrency(stats.revenue)})` : ""}
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs gap-1"
                                    onClick={() => openEdit(s.id!)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edytuj
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => openCostCalc(s)}
                                    title="Kalkulacja kosztów"
                                  >
                                    <Calculator className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleDuplicate(s.id!)}
                                    title="Duplikuj"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Usuń usługę</AlertDialogTitle>
                                        <AlertDialogDescription>Usunąć &ldquo;{s.name}&rdquo;?</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => { remove(s.id!); toast.success("Usunięto"); }}>
                                          Usuń
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ── Widok tabelaryczny (Desktop & opcjonalnie tablet) ── */}
                      <div className={viewMode === "cards" ? "hidden" : "hidden sm:block overflow-x-auto"}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8"><Checkbox checked={selectedIds.size === paginated.length && paginated.length > 0} onCheckedChange={(c) => c ? setSelectedIds(new Set(paginated.map((s) => s.id!))) : setSelectedIds(new Set())} /></TableHead>
                              <TableHead>Usługa</TableHead>
                              <TableHead>Kategoria</TableHead>
                              <TableHead className="text-right">Cena netto</TableHead>
                              <TableHead className="text-right">Brutto</TableHead>
                              <TableHead className="text-center">Czas</TableHead>
                              <TableHead className="text-center">Użycia</TableHead>
                              <TableHead className="text-right">Przychód</TableHead>
                              <TableHead className="w-28">Akcje</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {paginated.map((s, i) => {
                                const stats = serviceStats[s.id!];
                                const margin = getMargin(s);
                                const hasVariants = s.variants && s.variants.length > 0;
                                const hasMaterials = s.relatedMaterialIds && s.relatedMaterialIds.length > 0;
                                return (
                                  <motion.tr key={s.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className={`border-b border-border/50 hover:bg-accent/50 transition-colors ${selectedIds.has(s.id!) ? "bg-primary/5" : ""}`}>
                                    <TableCell><Checkbox checked={selectedIds.has(s.id!)} onCheckedChange={() => toggleSelect(s.id!)} /></TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-semibold text-sm flex items-center gap-1">
                                          {s.name}
                                          {hasVariants && <span title="Ma warianty"><Layers className="h-3 w-3 text-purple-500" /></span>}
                                          {hasMaterials && <span title="Powiązane materiały"><Link2 className="h-3 w-3 text-blue-500" /></span>}
                                        </div>
                                        {s.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</div>}
                                        {s.subcategory && <Badge variant="outline" className="text-[9px] mt-0.5">{s.subcategory}</Badge>}
                                      </div>
                                    </TableCell>
                                    <TableCell><Badge className={`text-xs ${CATEGORY_COLORS[s.category]}`}>{CATEGORY_LABELS[s.category]}</Badge></TableCell>
                                    <TableCell className="text-right">
                                      <div className="font-semibold text-sm">{formatCurrency(s.priceNetto)}</div>
                                      {margin !== null && <div className={`text-[10px] ${margin >= 30 ? "text-emerald-600" : margin >= 15 ? "text-amber-600" : "text-red-500"}`}>marża {margin}%</div>}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-primary text-sm">{formatCurrency(s.priceNetto * (1 + s.vatRate / 100))}</TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground">{s.estimatedMinutes ? `${s.estimatedMinutes} min` : "—"}</TableCell>
                                    <TableCell className="text-center"><span className="text-xs font-semibold">{stats?.usageCount || 0}</span></TableCell>
                                    <TableCell className="text-right text-xs">{stats?.revenue ? <span className="font-semibold text-emerald-600">{formatCurrency(stats.revenue)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s.id!)} title="Edytuj"><Pencil className="h-3 w-3" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCostCalc(s)} title="Kalkulacja"><Calculator className="h-3 w-3" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(s.id!)} title="Duplikuj"><Copy className="h-3 w-3" /></Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
                                          <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Usuń usługę</AlertDialogTitle><AlertDialogDescription>Usunąć &ldquo;{s.name}&rdquo;?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={() => { remove(s.id!); toast.success("Usunięto"); }}>Usuń</AlertDialogAction></AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4">
                          <p className="text-xs sm:text-sm text-muted-foreground">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} z {filtered.length}</p>
                          <div className="flex gap-1.5 w-full sm:w-auto justify-end">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="flex-1 sm:flex-none">Poprzednia</Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="flex-1 sm:flex-none">Następna</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Analityka ── */}
            <TabsContent value="analytics" className="mt-4 space-y-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Revenue by category */}
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Przychód per kategoria</CardTitle></CardHeader>
                  <CardContent>
                    {analytics.categoryData.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div> : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={analytics.categoryData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="revenue" nameKey="name" paddingAngle={2}>
                            {analytics.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Top services by usage */}
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 usług wg użycia</CardTitle></CardHeader>
                  <CardContent>
                    {analytics.topByUsage.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div> : (
                      <div className="space-y-2">
                        {analytics.topByUsage.slice(0, 7).map((s, i) => {
                          const maxUsage = analytics.topByUsage[0]?.usage || 1;
                          return (
                            <div key={s.id} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium truncate max-w-[55%]">{i + 1}. {s.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-muted-foreground">{s.usage}×</span>
                                  <span className="font-bold text-primary">{formatCurrency(s.revenue)}</span>
                                </div>
                              </div>
                              <Progress value={round((s.usage / maxUsage) * 100)} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Price history trend */}
              {analytics.priceChanges.length > 0 && (
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Trend zmian cen (średnia)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={analytics.priceChanges}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-[10px]" tick={{ fontSize: 10 }} />
                        <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        <Line type="monotone" dataKey="avgPrice" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Unused services */}
              {analytics.unusedServices.length > 0 && (
                <Card className="card-modern border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Nieużywane usługi ({analytics.unusedServices.length})</CardTitle><CardDescription>Usługi, które nigdy nie pojawiły się w wycenie</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analytics.unusedServices.slice(0, 15).map((s) => (
                        <Badge key={s.id} variant="outline" className="text-xs">{s.name} — {formatCurrency(s.priceNetto)}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Cennik (pricing comparison) ── */}
            <TabsContent value="pricing" className="mt-4 space-y-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <CardTitle className="text-base">Cennik zaawansowany — rentowność i marże</CardTitle>
                      <CardDescription className="text-xs">Porównanie ceny netto do kosztu własnego oraz marży na usłudze</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const withCost = services.filter((s) => s.costPrice && s.costPrice > 0);
                    if (withCost.length === 0) return <div className="text-center py-8 text-muted-foreground text-sm">Dodaj koszt własny do usług w edycji, aby zobaczyć analizę rentowności.</div>;
                    const data = withCost.map((s) => ({
                      name: s.name.length > 22 ? s.name.slice(0, 22) + "…" : s.name,
                      fullName: s.name,
                      unit: s.unit,
                      cena: s.priceNetto,
                      koszt: s.costPrice || 0,
                      zysk: round(s.priceNetto - (s.costPrice || 0)),
                      marza: round(((s.priceNetto - (s.costPrice || 0)) / s.priceNetto) * 100),
                    })).sort((a, b) => b.marza - a.marza);

                    return (
                      <div className="space-y-4">
                        {/* Mobile list / cards for pricing */}
                        <div className="grid gap-2.5 sm:hidden">
                          {data.map((item, idx) => (
                            <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card/60 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-sm leading-snug line-clamp-2">{item.fullName}</span>
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] font-bold shrink-0 ${
                                    item.marza >= 50
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : item.marza >= 30
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  }`}
                                >
                                  Marża {item.marza}%
                                </Badge>
                              </div>

                              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/40 text-center">
                                <div className="bg-muted/30 p-1.5 rounded">
                                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Koszt</div>
                                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(item.koszt)}</div>
                                </div>
                                <div className="bg-muted/30 p-1.5 rounded">
                                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Cena netto</div>
                                  <div className="text-xs font-bold text-primary">{formatCurrency(item.cena)}</div>
                                </div>
                                <div className="bg-muted/30 p-1.5 rounded">
                                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Zysk / j.m.</div>
                                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(item.zysk)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop chart */}
                        <div className="hidden sm:block">
                          <ResponsiveContainer width="100%" height={Math.max(260, data.length * 36)}>
                            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis type="number" className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v} zł`} />
                              <YAxis type="category" dataKey="name" className="text-[10px]" tick={{ fontSize: 10 }} width={140} />
                              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                              <Legend wrapperStyle={{ fontSize: "11px" }} />
                              <Bar dataKey="cena" name="Cena netto" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
                              <Bar dataKey="koszt" name="Koszt własny" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Price range comparison */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Zakres cenowy usług</CardTitle>
                  <CardDescription className="text-xs">Min / Aktualna / Max — widełki cenowe do negocjacji</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const withRange = services.filter((s) => s.priceMin && s.priceMax && s.priceMin > 0);
                    if (withRange.length === 0) return <div className="text-center py-8 text-muted-foreground text-sm">Ustaw ceny minimalne i maksymalne w szczegółach usług aby zobaczyć widełki.</div>;
                    return (
                      <div className="space-y-4">
                        {withRange.slice(0, 12).map((s) => {
                          const range = (s.priceMax || 0) - (s.priceMin || 0);
                          const position = range > 0 ? Math.min(100, Math.max(0, round(((s.priceNetto - (s.priceMin || 0)) / range) * 100))) : 50;
                          return (
                            <div key={s.id} className="p-2.5 rounded-lg bg-muted/20 border border-border/50 space-y-1.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                                <span className="font-semibold text-foreground truncate">{s.name}</span>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                  <span>Min: <span className="font-medium text-foreground">{formatCurrency(s.priceMin || 0)}</span></span>
                                  <span>·</span>
                                  <span className="font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">{formatCurrency(s.priceNetto)}</span>
                                  <span>·</span>
                                  <span>Max: <span className="font-medium text-foreground">{formatCurrency(s.priceMax || 0)}</span></span>
                                </div>
                              </div>
                              <div className="relative h-2.5 rounded-full bg-accent/60 overflow-hidden">
                                <div className="absolute h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 opacity-60 w-full" />
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background shadow-md transform -translate-x-1/2"
                                  style={{ left: `${position}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </StaggerItem>
      </StaggerContainer>

      {/* ── Dialog dodawania/edycji ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edytuj usługę" : "Nowa usługa"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nazwa usługi</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Kategoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: (v ?? "montaz") as ServiceCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Podkategoria (opcj.)</Label>
                <Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="np. Łazienka" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Jednostka</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: (v ?? "szt") as Unit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>VAT</Label>
                <Select value={String(form.vatRate)} onValueChange={(v) => setForm({ ...form, vatRate: parseInt(v ?? "8") as VatRate })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Czas (min)</Label>
                <Input type="number" min="0" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Cena netto (PLN)</Label>
                <Input type="number" step="0.01" min="0" value={form.priceNetto} onChange={(e) => setForm({ ...form, priceNetto: parseFloat(e.target.value) || 0 })} />
                {errors.priceNetto && <p className="text-destructive text-xs">{errors.priceNetto}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Cena min</Label>
                <Input type="number" step="0.01" min="0" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Cena max</Label>
                <Input type="number" step="0.01" min="0" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Koszt własny</Label>
              <Input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
              {form.costPrice > 0 && form.priceNetto > 0 && <p className="text-xs text-muted-foreground">Marża: {round(((form.priceNetto - form.costPrice) / form.priceNetto) * 100)}%</p>}
            </div>

            {/* Variants */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />Warianty cenowe</Label>
                <Button size="sm" variant="outline" onClick={addVariant}><Plus className="h-3 w-3 mr-1" />Dodaj wariant</Button>
              </div>
              {form.variants.map((v) => (
                <div key={v.id} className="flex gap-2 items-center p-2 rounded border border-border/50 bg-accent/30">
                  <Input className="flex-1" placeholder="Nazwa wariantu" value={v.name} onChange={(e) => updateVariant(v.id, "name", e.target.value)} />
                  <Input className="w-28" type="number" step="0.01" placeholder="Cena" value={v.priceNetto} onChange={(e) => updateVariant(v.id, "priceNetto", parseFloat(e.target.value) || 0)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeVariant(v.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {form.variants.length === 0 && <p className="text-xs text-muted-foreground">Brak wariantów — np. Ekonomiczny, Standard, Premium</p>}
            </div>

            {/* Related materials */}
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />Powiązane materiały</Label>
              {materials.length === 0 ? <p className="text-xs text-muted-foreground">Brak materiałów w bazie</p> : (
                <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2">
                  {materials.slice(0, 20).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 p-1 rounded">
                      <Checkbox checked={form.relatedMaterialIds.includes(m.id!)} onCheckedChange={() => toggleMaterial(m.id!)} />
                      <span>{m.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(m.purchasePrice)}</span>
                    </label>
                  ))}
                </div>
              )}
              {form.relatedMaterialIds.length > 0 && (
                <p className="text-xs text-muted-foreground">Koszt materiałów: {formatCurrency(form.relatedMaterialIds.reduce((s, id) => s + (materials.find((m) => m.id === id)?.purchasePrice || 0), 0))}</p>
              )}
            </div>

            <Separator />
            <div className="grid gap-2">
              <Label>Opis (widoczny dla klienta)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Notatki wewnętrzne</Label>
              <Textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz" : "Dodaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog bulk actions ── */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === "price" && "Zmiana cen"}
              {bulkAction === "category" && "Zmiana kategorii"}
              {bulkAction === "delete" && "Usuwanie usług"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Dotyczy {selectedIds.size} zaznaczonych usług</p>
            {bulkAction === "price" && (
              <div className="grid gap-2">
                <Label>Zmiana ceny (%)</Label>
                <Input type="number" value={bulkPercent} onChange={(e) => setBulkPercent(parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">Dodatnia = podwyżka, ujemna = obniżka</p>
              </div>
            )}
            {bulkAction === "category" && (
              <div className="grid gap-2">
                <Label>Nowa kategoria</Label>
                <Select value={bulkCategory} onValueChange={(v) => setBulkCategory((v ?? "montaz") as ServiceCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {bulkAction === "delete" && <p className="text-sm text-destructive font-semibold">Usunąć {selectedIds.size} usług? Nie można cofnąć.</p>}
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className={bulkAction === "delete" ? "bg-destructive text-white hover:bg-destructive/90" : "btn-primary"} onClick={executeBulkAction}>
              {bulkAction === "price" ? "Zastosuj" : bulkAction === "category" ? "Zmień" : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog cost calculation ── */}
      <Dialog open={costCalcOpen} onOpenChange={setCostCalcOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="h-4 w-4" />Kalkulacja kosztów</DialogTitle></DialogHeader>
          {costCalcService && (() => {
            const breakdown = getCostBreakdown(costCalcService);
            return (
              <div className="py-4 space-y-4">
                <div className="text-lg font-bold">{costCalcService.name}</div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-accent/50">
                    <span className="text-sm">Cena netto</span>
                    <span className="font-bold text-primary">{formatCurrency(costCalcService.priceNetto)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between p-2 rounded bg-red-50 dark:bg-red-950/20">
                    <span className="text-sm">Koszt materiałów ({breakdown.linkedMaterials.length})</span>
                    <span className="font-bold text-red-600">{formatCurrency(breakdown.materialCost)}</span>
                  </div>
                  {breakdown.linkedMaterials.map((m) => m && (
                    <div key={m.id} className="flex justify-between pl-4 text-xs text-muted-foreground">
                      <span>{m.name}</span>
                      <span>{formatCurrency(m.purchasePrice)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                    <span className="text-sm">Koszt robocizny ({costCalcService.estimatedMinutes || 0} min × 100 zł/h)</span>
                    <span className="font-bold text-amber-600">{formatCurrency(breakdown.laborCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between p-2 rounded bg-accent/50 font-bold">
                    <span>Koszt łączny</span>
                    <span className="text-red-600">{formatCurrency(breakdown.totalCost)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-green-50 dark:bg-green-950/20 font-bold">
                    <span>Zysk</span>
                    <span className="text-green-600">{formatCurrency(costCalcService.priceNetto - breakdown.totalCost)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-accent/50">
                    <span className="text-sm">Marża</span>
                    <Badge className={breakdown.margin >= 30 ? "bg-green-100 text-green-700" : breakdown.margin >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{breakdown.margin}%</Badge>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
