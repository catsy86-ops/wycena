"use client";

import { useState, useMemo, useRef } from "react";
import { useMaterialStore } from "@/store/material-store";
import { useQuoteStore } from "@/store/quote-store";
import { materialSchema } from "@/lib/validators";
import { UNIT_LABELS, VAT_RATE_LABELS, type VatRate, type Unit } from "@/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Pencil, Trash2, Search, Package, AlertTriangle, Download, Upload,
  BarChart3, TrendingUp, ShoppingCart, History, QrCode, Truck,
  CheckSquare, Copy, DollarSign, Warehouse, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { BoltRow } from "@/components/hydraulic-decorations";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface PriceHistoryEntry {
  date: string;
  price: number;
  reason?: string;
}

interface SupplierOrder {
  id: string;
  materialId: number;
  materialName: string;
  quantity: number;
  supplier: string;
  status: "oczekujace" | "zamowione" | "dostarczone";
  orderDate: Date;
  notes?: string;
}

const EMPTY_FORM = {
  name: "", category: "", unit: "szt" as Unit,
  purchasePrice: 0, salePrice: 0, vatRate: 23 as VatRate,
  stockQuantity: 0, minStockLevel: 5, supplier: "", sku: "", description: "", barcode: "",
};

export default function MaterialyPage() {
  const materials = useMaterialStore((s) => s.materials);
  const loading = useMaterialStore((s) => s.loading);
  const search = useMaterialStore((s) => s.search);
  const categoryFilter = useMaterialStore((s) => s.categoryFilter);
  const setSearch = useMaterialStore((s) => s.setSearch);
  const setCategoryFilter = useMaterialStore((s) => s.setCategoryFilter);
  const add = useMaterialStore((s) => s.add);
  const update = useMaterialStore((s) => s.update);
  const remove = useMaterialStore((s) => s.remove);
  const getCategories = useMaterialStore((s) => s.getCategories);
  const getLowStock = useMaterialStore((s) => s.getLowStock);
  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("list");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<typeof materials[0] | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({ materialId: 0, quantity: 0, supplier: "", notes: "" });
  const [orders, setOrders] = useState<SupplierOrder[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wycenka-supplier-orders");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ["all", ...getCategories()];
  const lowStock = getLowStock();

  // ─── Filtrowanie ────────────────────────────────────────────────────────
  const filtered = useMemo(() => materials.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.sku || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.supplier || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [materials, search, categoryFilter]);

  // ─── Statystyki magazynowe ──────────────────────────────────────────────
  const warehouseStats = useMemo(() => {
    const totalValue = materials.reduce((s, m) => s + m.purchasePrice * m.stockQuantity, 0);
    const totalSaleValue = materials.reduce((s, m) => s + m.salePrice * m.stockQuantity, 0);
    const totalItems = materials.reduce((s, m) => s + m.stockQuantity, 0);
    const lowStockCount = lowStock.length;
    const avgMargin = materials.length > 0
      ? round(materials.reduce((s, m) => s + (m.salePrice > 0 ? ((m.salePrice - m.purchasePrice) / m.salePrice) * 100 : 0), 0) / materials.length)
      : 0;

    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; value: number }> = {};
    materials.forEach((m) => {
      if (!categoryBreakdown[m.category]) categoryBreakdown[m.category] = { count: 0, value: 0 };
      categoryBreakdown[m.category].count += m.stockQuantity;
      categoryBreakdown[m.category].value += m.purchasePrice * m.stockQuantity;
    });
    const categoryData = Object.entries(categoryBreakdown).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.value - a.value);

    // Supplier breakdown
    const supplierBreakdown: Record<string, { count: number; value: number }> = {};
    materials.forEach((m) => {
      const sup = m.supplier || "Brak dostawcy";
      if (!supplierBreakdown[sup]) supplierBreakdown[sup] = { count: 0, value: 0 };
      supplierBreakdown[sup].count++;
      supplierBreakdown[sup].value += m.purchasePrice * m.stockQuantity;
    });
    const supplierData = Object.entries(supplierBreakdown).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.value - a.value).slice(0, 8);

    // Top expensive materials
    const topExpensive = [...materials].sort((a, b) => (b.purchasePrice * b.stockQuantity) - (a.purchasePrice * a.stockQuantity)).slice(0, 5);

    return { totalValue, totalSaleValue, totalItems, lowStockCount, avgMargin, categoryData, supplierData, topExpensive };
  }, [materials, lowStock]);

  // ─── Zużycie materiałów (z wycen) ──────────────────────────────────────
  const usageData = useMemo(() => {
    const usage: Record<string, { name: string; used: number; revenue: number }> = {};
    quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
      q.items.forEach((item) => {
        const mat = materials.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
        if (mat) {
          if (!usage[mat.name]) usage[mat.name] = { name: mat.name, used: 0, revenue: 0 };
          usage[mat.name].used += item.quantity;
          usage[mat.name].revenue += item.bruttoTotal;
        }
      });
    });
    return Object.values(usage).sort((a, b) => b.used - a.used).slice(0, 10);
  }, [quotes, materials]);

  // ─── CRUD ──────────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    const m = materials.find((x) => x.id === id);
    if (!m) return;
    setEditingId(id);
    setForm({
      name: m.name, category: m.category, unit: m.unit,
      purchasePrice: m.purchasePrice, salePrice: m.salePrice, vatRate: m.vatRate,
      stockQuantity: m.stockQuantity, minStockLevel: m.minStockLevel,
      supplier: m.supplier || "", sku: m.sku || "", description: m.description || "",
      barcode: (m as any).barcode || "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function handleSave() {
    const result = materialSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as string] = issue.message; });
      setErrors(fieldErrors);
      return;
    }
    const data = { ...result.data, barcode: form.barcode || undefined } as any;
    if (editingId) {
      // Track price history
      const existing = materials.find((m) => m.id === editingId);
      if (existing && existing.purchasePrice !== data.purchasePrice) {
        const history: PriceHistoryEntry[] = JSON.parse(localStorage.getItem(`mat-price-${editingId}`) || "[]");
        history.push({ date: new Date().toISOString(), price: data.purchasePrice, reason: "Zmiana ceny" });
        localStorage.setItem(`mat-price-${editingId}`, JSON.stringify(history));
      }
      update(editingId, data);
      toast.success("Materiał zaktualizowany");
    } else {
      add(data);
      toast.success("Materiał dodany");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Materiał usunięty");
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────
  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((m) => m.id!)));
  }
  async function handleBulkDelete() {
    for (const id of selectedIds) { await remove(id); }
    setSelectedIds(new Set());
    toast.success(`Usunięto ${selectedIds.size} materiałów`);
  }
  function handleBulkDuplicate() {
    selectedIds.forEach((id) => {
      const m = materials.find((x) => x.id === id);
      if (m) add({ ...m, id: undefined, name: `${m.name} (kopia)` } as any);
    });
    setSelectedIds(new Set());
    toast.success("Materiały zduplikowane");
  }

  // ─── Historia cen ──────────────────────────────────────────────────────
  function openHistory(m: typeof materials[0]) {
    setHistoryMaterial(m);
    setHistoryDialogOpen(true);
  }
  function getPriceHistory(id: number): PriceHistoryEntry[] {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(`mat-price-${id}`) || "[]");
  }

  // ─── Zamówienia do dostawców ────────────────────────────────────────────
  function openOrder(materialId?: number) {
    const m = materialId ? materials.find((x) => x.id === materialId) : null;
    setOrderForm({
      materialId: materialId || 0,
      quantity: m ? Math.max(0, m.minStockLevel * 2 - m.stockQuantity) : 0,
      supplier: m?.supplier || "",
      notes: "",
    });
    setOrderDialogOpen(true);
  }

  function saveOrder() {
    if (!orderForm.materialId || orderForm.quantity <= 0) {
      toast.error("Uzupełnij dane zamówienia");
      return;
    }
    const mat = materials.find((m) => m.id === orderForm.materialId);
    const newOrder: SupplierOrder = {
      id: crypto.randomUUID(),
      materialId: orderForm.materialId,
      materialName: mat?.name || "",
      quantity: orderForm.quantity,
      supplier: orderForm.supplier,
      status: "oczekujace",
      orderDate: new Date(),
      notes: orderForm.notes || undefined,
    };
    const updated = [...orders, newOrder];
    setOrders(updated);
    localStorage.setItem("wycenka-supplier-orders", JSON.stringify(updated));
    setOrderDialogOpen(false);
    toast.success("Zamówienie utworzone");
  }

  function updateOrderStatus(id: string, status: SupplierOrder["status"]) {
    const updated = orders.map((o) => o.id === id ? { ...o, status } : o);
    setOrders(updated);
    localStorage.setItem("wycenka-supplier-orders", JSON.stringify(updated));
    if (status === "dostarczone") {
      const order = orders.find((o) => o.id === id);
      if (order) {
        const mat = materials.find((m) => m.id === order.materialId);
        if (mat) update(mat.id!, { stockQuantity: mat.stockQuantity + order.quantity });
      }
      toast.success("Dostawa przyjęta — stan zaktualizowany");
    } else {
      toast.success("Status zamówienia zmieniony");
    }
  }

  function deleteOrder(id: string) {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    localStorage.setItem("wycenka-supplier-orders", JSON.stringify(updated));
    toast.success("Zamówienie usunięte");
  }

  // ─── Import/Export CSV ─────────────────────────────────────────────────
  function handleExportCSV() {
    const headers = ["Nazwa", "Kategoria", "Jednostka", "Cena zakupu", "Cena sprzedaży", "VAT", "Stan", "Min. stan", "Dostawca", "SKU", "Kod kreskowy"];
    const rows = materials.map((m) => [
      m.name, m.category, UNIT_LABELS[m.unit], m.purchasePrice, m.salePrice, `${m.vatRate}%`, m.stockQuantity, m.minStockLevel, m.supplier || "", m.sku || "", (m as any).barcode || ""
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `materialy-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV wyeksportowany");
  }

  function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const headers = lines[0].split(/[;,]/);
      const nameIdx = headers.findIndex((h) => h.toLowerCase().includes("nazwa"));
      const catIdx = headers.findIndex((h) => h.toLowerCase().includes("kategoria"));
      const unitIdx = headers.findIndex((h) => h.toLowerCase().includes("jednostka"));
      const purchaseIdx = headers.findIndex((h) => h.toLowerCase().includes("zakup"));
      const saleIdx = headers.findIndex((h) => h.toLowerCase().includes("sprzeda"));
      const vatIdx = headers.findIndex((h) => h.toLowerCase().includes("vat"));
      const stockIdx = headers.findIndex((h) => h.toLowerCase().includes("stan"));
      const minIdx = headers.findIndex((h) => h.toLowerCase().includes("min"));
      const supplierIdx = headers.findIndex((h) => h.toLowerCase().includes("dostawca"));
      const skuIdx = headers.findIndex((h) => h.toLowerCase().includes("sku"));

      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[;,]/).map((c) => c.replace(/"/g, "").trim());
        const name = cols[nameIdx >= 0 ? nameIdx : 0];
        if (!name) continue;
        const unitMap: Record<string, Unit> = { "szt.": "szt", "szt": "szt", kg: "kg", m: "m", "m²": "m2", "m2": "m2", "godz.": "godz", "kpl.": "kpl", mb: "mb", komplet: "komplet" };
        const unit = unitMap[cols[unitIdx >= 0 ? unitIdx : 2]] || "szt";
        const vatStr = (cols[vatIdx >= 0 ? vatIdx : 5] || "23").replace("%", "");
        const vatRate = [0, 8, 23].includes(parseInt(vatStr)) ? parseInt(vatStr) as VatRate : 23;
        await add({
          name,
          category: cols[catIdx >= 0 ? catIdx : 1] || "Inne",
          unit,
          purchasePrice: parseFloat(cols[purchaseIdx >= 0 ? purchaseIdx : 3]) || 0,
          salePrice: parseFloat(cols[saleIdx >= 0 ? saleIdx : 4]) || 0,
          vatRate,
          stockQuantity: parseInt(cols[stockIdx >= 0 ? stockIdx : 6]) || 0,
          minStockLevel: parseInt(cols[minIdx >= 0 ? minIdx : 7]) || 5,
          supplier: cols[supplierIdx >= 0 ? supplierIdx : 8] || "",
          sku: cols[skuIdx >= 0 ? skuIdx : 9] || "",
          description: "",
        });
        count++;
      }
      toast.success(`Zaimportowano ${count} materiałów`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe section-industrial">Materiały</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Magazyn, stany, ceny i zamówienia</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold shadow-sm cursor-pointer hover:bg-accent transition-colors">
                <Upload className="h-4 w-4" />Import CSV
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
              </label>
              <Button variant="outline" className="btn-secondary" onClick={handleExportCSV}>
                <Download className="h-4 w-4" /><span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button variant="outline" className="btn-secondary" onClick={() => openOrder()}>
                <ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Zamów</span>
              </Button>
              <Button className="btn-primary" onClick={openAdd}>
                <Plus className="h-4 w-4" />Dodaj materiał
              </Button>
            </div>
          </div>
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Warehouse className="h-3 w-3" />Wartość magazynu</div>
                <div className="text-lg font-black">{formatCurrency(warehouseStats.totalValue)}</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Wartość sprzedaży</div>
                <div className="text-lg font-black text-green-600">{formatCurrency(warehouseStats.totalSaleValue)}</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Pozycji w magazynie</div>
                <div className="text-lg font-black">{warehouseStats.totalItems}</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Śr. marża</div>
                <div className="text-lg font-black">{warehouseStats.avgMargin}%</div>
              </CardContent>
            </Card>
            <Card className={`card-steel ${warehouseStats.lowStockCount > 0 ? "border-amber-300 dark:border-amber-700" : ""}`}>
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Niski stan</div>
                <div className={`text-lg font-black ${warehouseStats.lowStockCount > 0 ? "text-amber-600" : ""}`}>{warehouseStats.lowStockCount}</div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <StaggerItem>
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">Niski stan magazynowy ({lowStock.length})</h3>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { lowStock.forEach((m) => openOrder(m.id!)); }}>
                    <ShoppingCart className="h-3 w-3 mr-1" />Zamów brakujące
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lowStock.slice(0, 10).map((m) => (
                    <Badge key={m.id} variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 cursor-pointer" onClick={() => openOrder(m.id!)}>
                      {m.name}: {m.stockQuantity}/{m.minStockLevel} {UNIT_LABELS[m.unit]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {/* Tabs */}
        <StaggerItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="list">Lista ({filtered.length})</TabsTrigger>
              <TabsTrigger value="stats">Statystyki</TabsTrigger>
              <TabsTrigger value="orders">Zamówienia ({orders.filter((o) => o.status !== "dostarczone").length})</TabsTrigger>
              <TabsTrigger value="usage">Zużycie</TabsTrigger>
            </TabsList>

            {/* ── Lista ── */}
            <TabsContent value="list" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Szukaj materiałów (nazwa, SKU, dostawca)..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                      <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat === "all" ? "Wszystkie kategorie" : cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedIds.size > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary">{selectedIds.size} zaznaczonych</Badge>
                      <Button size="sm" variant="outline" onClick={handleBulkDuplicate}><Copy className="h-3 w-3 mr-1" />Duplikuj</Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Usuń</Button>} />
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Usuń materiały</AlertDialogTitle><AlertDialogDescription>Usunąć {selectedIds.size} materiałów?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Usuń</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Wyczyść</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
                    <AnimatedEmptyState icon={Package} title={materials.length === 0 ? "Brak materiałów" : "Brak wyników"} description={materials.length === 0 ? "Dodaj pierwszy materiał lub zaimportuj CSV" : "Zmień kryteria wyszukiwania"} action={materials.length === 0 ? <Button className="btn-primary" onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Dodaj materiał</Button> : undefined} />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={(c) => c ? setSelectedIds(new Set(filtered.map((m) => m.id!))) : setSelectedIds(new Set())} /></TableHead>
                            <TableHead>Nazwa</TableHead>
                            <TableHead>Kategoria</TableHead>
                            <TableHead>Stan</TableHead>
                            <TableHead className="text-right">Cena zakupu</TableHead>
                            <TableHead className="text-right">Cena sprzedaży</TableHead>
                            <TableHead className="text-right">Marża</TableHead>
                            <TableHead>Dostawca</TableHead>
                            <TableHead className="w-28">Akcje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filtered.map((m, index) => {
                              const margin = m.salePrice > 0 ? round(((m.salePrice - m.purchasePrice) / m.salePrice) * 100) : 0;
                              const stockPct = m.minStockLevel > 0 ? Math.min(100, round((m.stockQuantity / (m.minStockLevel * 2)) * 100)) : 100;
                              return (
                                <motion.tr key={m.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.03 }} className={`group border-b border-border/50 hover:bg-accent/50 transition-colors ${selectedIds.has(m.id!) ? "bg-primary/5" : ""}`}>
                                  <TableCell><Checkbox checked={selectedIds.has(m.id!)} onCheckedChange={() => toggleSelect(m.id!)} /></TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-semibold">{m.name}</div>
                                      <div className="flex gap-1 mt-0.5">
                                        {m.sku && <span className="text-[10px] text-muted-foreground font-mono">SKU: {m.sku}</span>}
                                        {(m as any).barcode && <span className="text-[10px] text-muted-foreground font-mono ml-1">EAN: {(m as any).barcode}</span>}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant="outline" className="text-xs">{m.category}</Badge></TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <span className={`text-sm font-medium ${m.stockQuantity <= m.minStockLevel ? "text-amber-600" : ""}`}>
                                        {m.stockQuantity} {UNIT_LABELS[m.unit]}
                                      </span>
                                      <Progress value={stockPct} className="h-1.5" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatCurrency(m.purchasePrice)}</TableCell>
                                  <TableCell className="text-right font-bold text-primary">{formatCurrency(m.salePrice)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge className={margin >= 30 ? "bg-green-100 text-green-700" : margin >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{margin}%</Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{m.supplier || "—"}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m.id!)} title="Edytuj"><Pencil className="h-3 w-3" /></Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHistory(m)} title="Historia cen"><History className="h-3 w-3" /></Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openOrder(m.id!)} title="Zamów"><ShoppingCart className="h-3 w-3" /></Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
                                        <AlertDialogContent>
                                          <AlertDialogHeader><AlertDialogTitle>Usuń materiał</AlertDialogTitle><AlertDialogDescription>Usunąć &ldquo;{m.name}&rdquo;?</AlertDialogDescription></AlertDialogHeader>
                                          <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(m.id!)}>Usuń</AlertDialogAction></AlertDialogFooter>
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Statystyki ── */}
            <TabsContent value="stats" className="mt-4 space-y-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Wartość per kategoria</CardTitle></CardHeader>
                  <CardContent>
                    {warehouseStats.categoryData.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div> : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={warehouseStats.categoryData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" nameKey="name" paddingAngle={2}>
                            {warehouseStats.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Top dostawcy wg wartości</CardTitle></CardHeader>
                  <CardContent>
                    {warehouseStats.supplierData.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div> : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={warehouseStats.supplierData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" className="text-[10px]" tick={{ fontSize: 10 }} width={80} />
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="card-modern">
                <CardHeader className="pb-2"><CardTitle className="text-base">Najdroższe pozycje w magazynie</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {warehouseStats.topExpensive.map((m, i) => {
                      const value = m.purchasePrice * m.stockQuantity;
                      const maxVal = warehouseStats.topExpensive[0] ? warehouseStats.topExpensive[0].purchasePrice * warehouseStats.topExpensive[0].stockQuantity : 1;
                      return (
                        <div key={m.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{i + 1}. {m.name}</span>
                            <span className="font-bold text-primary">{formatCurrency(value)}</span>
                          </div>
                          <Progress value={round((value / maxVal) * 100)} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Zamówienia ── */}
            <TabsContent value="orders" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />Zamówienia do dostawców</CardTitle>
                    <Button size="sm" className="btn-primary" onClick={() => openOrder()}><Plus className="h-3 w-3 mr-1" />Nowe zamówienie</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <AnimatedEmptyState icon={ShoppingCart} title="Brak zamówień" description="Utwórz zamówienie do dostawcy" />
                  ) : (
                    <div className="space-y-3">
                      {orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-sm">{order.materialName}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.quantity} szt. · {order.supplier || "Brak dostawcy"} · {format(new Date(order.orderDate), "dd.MM.yyyy", { locale: pl })}
                            </div>
                            {order.notes && <div className="text-xs text-muted-foreground italic">{order.notes}</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v as SupplierOrder["status"])}>
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="oczekujace">Oczekujące</SelectItem>
                                <SelectItem value="zamowione">Zamówione</SelectItem>
                                <SelectItem value="dostarczone">Dostarczone</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteOrder(order.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Zużycie ── */}
            <TabsContent value="usage" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-2"><CardTitle className="text-base">Zużycie materiałów (z zaakceptowanych wycen)</CardTitle></CardHeader>
                <CardContent>
                  {usageData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak danych — materiały zostaną dopasowane po nazwie z pozycji wycen</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={usageData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-[10px]" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="used" name="Zużyto" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </StaggerItem>
      </StaggerContainer>

      {/* Dialog - Add/Edit Material */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edytuj materiał" : "Nowy materiał"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nazwa materiału</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Kategoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="np. Rury, Baterie" />
                {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Jednostka</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as Unit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>VAT</Label>
                <Select value={String(form.vatRate)} onValueChange={(v) => setForm({ ...form, vatRate: parseInt(v ?? "23") as VatRate })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Kod kreskowy (EAN)</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="np. 5901234123457" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cena zakupu (PLN)</Label>
                <Input type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })} />
                {errors.purchasePrice && <p className="text-destructive text-xs">{errors.purchasePrice}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Cena sprzedaży (PLN)</Label>
                <Input type="number" step="0.01" min="0" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: parseFloat(e.target.value) || 0 })} />
                {errors.salePrice && <p className="text-destructive text-xs">{errors.salePrice}</p>}
                {form.salePrice > 0 && form.purchasePrice > 0 && (
                  <p className="text-xs text-muted-foreground">Marża: {round(((form.salePrice - form.purchasePrice) / form.salePrice) * 100)}%</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stan magazynowy</Label>
                <Input type="number" min="0" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Minimalny stan</Label>
                <Input type="number" min="0" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Dostawca</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Opis</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj materiał"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Price History */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Historia cen: {historyMaterial?.name}</DialogTitle></DialogHeader>
          <div className="py-4">
            {historyMaterial && (() => {
              const history = getPriceHistory(historyMaterial.id!);
              if (history.length === 0) return <p className="text-sm text-muted-foreground">Brak historii zmian cen</p>;
              return (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-[9px]" tick={{ fontSize: 9 }} tickFormatter={(v) => format(new Date(v), "dd.MM")} />
                      <YAxis className="text-[9px]" tick={{ fontSize: 9 }} />
                      <Tooltip labelFormatter={(v) => format(new Date(v as string), "dd.MM.yyyy")} formatter={(v) => formatCurrency(Number(v))} />
                      <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {history.slice().reverse().map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-accent/50">
                        <div>
                          <div className="font-medium">{formatCurrency(entry.price)}</div>
                          <div className="text-xs text-muted-foreground">{entry.reason || "Zmiana"}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{format(new Date(entry.date), "dd.MM.yyyy")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog - New Order */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nowe zamówienie do dostawcy</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Materiał</Label>
              <Select value={String(orderForm.materialId)} onValueChange={(v) => {
                const id = parseInt(v ?? "0");
                const m = materials.find((x) => x.id === id);
                setOrderForm({ ...orderForm, materialId: id, supplier: m?.supplier || orderForm.supplier, quantity: m ? Math.max(1, m.minStockLevel * 2 - m.stockQuantity) : orderForm.quantity });
              }}>
                <SelectTrigger><SelectValue placeholder="Wybierz materiał..." /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name} (stan: {m.stockQuantity})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ilość</Label>
                <Input type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Dostawca</Label>
                <Input value={orderForm.supplier} onChange={(e) => setOrderForm({ ...orderForm, supplier: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Uwagi</Label>
              <Input value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} placeholder="np. pilne, termin do piątku" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className="btn-primary" onClick={saveOrder}>Utwórz zamówienie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
