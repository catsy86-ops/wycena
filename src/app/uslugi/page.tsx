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
import {
  Plus, Pencil, Trash2, Search, Package, Copy, TrendingUp,
  Clock, BarChart3, Percent, CheckSquare, Square, Wrench,
  ArrowUpRight, History, Star,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";

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
          if (!stats[item.serviceId].lastUsed || d > stats[item.serviceId].lastUsed!) {
            stats[item.serviceId].lastUsed = d;
          }
        }
      });
    });
    return stats;
  }, [quotes]);

  // ─── Filtrowanie i paginacja ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.subcategory || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [services, search, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // ─── Selekcja ──────────────────────────────────────────────────────────
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((s) => s.id!)));
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setForm({
      name: s.name, category: s.category, unit: s.unit,
      priceNetto: s.priceNetto, vatRate: s.vatRate,
      description: s.description || "",
      estimatedMinutes: s.estimatedMinutes || 0,
      internalNotes: s.internalNotes || "",
      subcategory: s.subcategory || "",
      priceMin: s.priceMin || 0,
      priceMax: s.priceMax || 0,
      costPrice: s.costPrice || 0,
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
    };
    if (editingId) {
      update(editingId, data);
      toast.success("Usługa zaktualizowana");
    } else {
      add(data);
      toast.success("Usługa dodana");
    }
    setDialogOpen(false);
  }

  function handleDuplicate(id: number) {
    duplicateService(id);
    toast.success("Usługa zduplikowana");
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────
  function openBulkDialog(action: "price" | "category" | "delete") {
    setBulkAction(action);
    setBulkDialogOpen(true);
  }

  function executeBulkAction() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (bulkAction === "price") {
      bulkUpdatePrice(ids, bulkPercent);
      toast.success(`Ceny zaktualizowane o ${bulkPercent > 0 ? "+" : ""}${bulkPercent}% dla ${ids.length} usług`);
    } else if (bulkAction === "category") {
      bulkUpdateCategory(ids, bulkCategory);
      toast.success(`Kategoria zmieniona dla ${ids.length} usług`);
    } else if (bulkAction === "delete") {
      bulkDelete(ids);
      toast.success(`Usunięto ${ids.length} usług`);
    }
    setSelectedIds(new Set());
    setBulkDialogOpen(false);
  }

  // ─── Marża kalkulacja ──────────────────────────────────────────────────
  function getMargin(s: typeof services[0]) {
    if (!s.costPrice || s.costPrice === 0) return null;
    const margin = round(((s.priceNetto - s.costPrice) / s.priceNetto) * 100);
    return margin;
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-5">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe">Katalog usług</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">{services.length} usług · {Object.keys(CATEGORY_LABELS).length} kategorii</p>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="btn-secondary text-xs" onClick={() => openBulkDialog("price")}>
                    <Percent className="h-3.5 w-3.5" />Zmień ceny ({selectedIds.size})
                  </Button>
                  <Button variant="outline" size="sm" className="btn-secondary text-xs" onClick={() => openBulkDialog("category")}>
                    <Package className="h-3.5 w-3.5" />Kategoria
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => openBulkDialog("delete")}>
                    <Trash2 className="h-3.5 w-3.5" />Usuń
                  </Button>
                </div>
              )}
              <Button className="btn-primary" onClick={openAdd}>
                <Plus className="h-4 w-4" />Dodaj usługę
              </Button>
            </div>
          </div>
        </StaggerItem>

        {/* Filtry */}
        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Szukaj usług..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
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
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
                <AnimatedEmptyState
                  icon={Wrench}
                  title={services.length === 0 ? "Brak usług" : "Brak wyników"}
                  description={services.length === 0 ? "Dodaj pierwszą usługę do katalogu" : "Zmień kryteria wyszukiwania"}
                  action={services.length === 0 ? <Button className="btn-primary" onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Dodaj usługę</Button> : undefined}
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <button onClick={toggleSelectAll} className="flex items-center justify-center">
                              {selectedIds.size === paginated.length && paginated.length > 0
                                ? <CheckSquare className="h-4 w-4 text-primary" />
                                : <Square className="h-4 w-4 text-muted-foreground" />}
                            </button>
                          </TableHead>
                          <TableHead>Usługa</TableHead>
                          <TableHead>Kategoria</TableHead>
                          <TableHead className="text-right">Cena netto</TableHead>
                          <TableHead className="text-right">Brutto</TableHead>
                          <TableHead className="text-center">Czas</TableHead>
                          <TableHead className="text-center">Użycia</TableHead>
                          <TableHead className="text-right">Przychód</TableHead>
                          <TableHead className="w-24">Akcje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {paginated.map((s, i) => {
                            const stats = serviceStats[s.id!];
                            const margin = getMargin(s);
                            const isSelected = selectedIds.has(s.id!);
                            return (
                              <motion.tr
                                key={s.id}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                className={`border-b border-border/50 hover:bg-accent/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                              >
                                <TableCell>
                                  <button onClick={() => toggleSelect(s.id!)} className="flex items-center justify-center">
                                    {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-semibold text-sm">{s.name}</div>
                                    {s.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</div>}
                                    {s.subcategory && <Badge variant="outline" className="text-[9px] mt-0.5">{s.subcategory}</Badge>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-xs ${CATEGORY_COLORS[s.category]}`}>{CATEGORY_LABELS[s.category]}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="font-semibold text-sm">{formatCurrency(s.priceNetto)}</div>
                                  {margin !== null && (
                                    <div className={`text-[10px] ${margin >= 30 ? "text-emerald-600" : margin >= 15 ? "text-amber-600" : "text-red-500"}`}>
                                      marża {margin}%
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary text-sm">
                                  {formatCurrency(s.priceNetto * (1 + s.vatRate / 100))}
                                </TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                  {s.estimatedMinutes ? `${s.estimatedMinutes} min` : "—"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {stats ? (
                                    <span className="text-xs font-semibold">{stats.usageCount}</span>
                                  ) : <span className="text-xs text-muted-foreground">0</span>}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  {stats?.revenue ? (
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.revenue)}</span>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s.id!)} title="Edytuj">
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(s.id!)} title="Duplikuj">
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Usuń usługę</AlertDialogTitle>
                                          <AlertDialogDescription>Usunąć &ldquo;{s.name}&rdquo;?</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => { remove(s.id!); toast.success("Usunięto"); }}>Usuń</AlertDialogAction>
                                        </AlertDialogFooter>
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
                  {/* Paginacja */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t mt-4">
                      <p className="text-sm text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} z {filtered.length}
                      </p>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Poprzednia</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Następna</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* ── Dialog dodawania/edycji ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj usługę" : "Nowa usługa"}</DialogTitle>
          </DialogHeader>
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
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
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
                  <SelectContent>
                    {Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Stawka VAT</Label>
                <Select value={String(form.vatRate)} onValueChange={(v) => setForm({ ...form, vatRate: parseInt(v ?? "8") as VatRate })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
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
                <Label>Cena min (opcj.)</Label>
                <Input type="number" step="0.01" min="0" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Cena max (opcj.)</Label>
                <Input type="number" step="0.01" min="0" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Koszt własny (opcj.)</Label>
              <Input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} placeholder="Koszt materiałów + czas" />
              {form.costPrice > 0 && form.priceNetto > 0 && (
                <p className="text-xs text-muted-foreground">Marża: {round(((form.priceNetto - form.costPrice) / form.priceNetto) * 100)}%</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Opis (widoczny dla klienta)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Notatki wewnętrzne</Label>
              <Textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} rows={2} placeholder="Np. wymaga 2 osób, klucz dynamometryczny..." />
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
                <p className="text-xs text-muted-foreground">Wartość dodatnia = podwyżka, ujemna = obniżka</p>
              </div>
            )}
            {bulkAction === "category" && (
              <div className="grid gap-2">
                <Label>Nowa kategoria</Label>
                <Select value={bulkCategory} onValueChange={(v) => setBulkCategory((v ?? "montaz") as ServiceCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {bulkAction === "delete" && (
              <p className="text-sm text-destructive font-semibold">Czy na pewno chcesz usunąć {selectedIds.size} usług? Tej operacji nie można cofnąć.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className={bulkAction === "delete" ? "bg-destructive text-white hover:bg-destructive/90" : "btn-primary"} onClick={executeBulkAction}>
              {bulkAction === "price" && "Zastosuj"}
              {bulkAction === "category" && "Zmień"}
              {bulkAction === "delete" && "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
