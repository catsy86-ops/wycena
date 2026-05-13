"use client";

import { useState } from "react";
import { useMaterialStore } from "@/store/material-store";
import { materialSchema } from "@/lib/validators";
import { UNIT_LABELS, VAT_RATE_LABELS, type VatRate, type Unit } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const EMPTY_FORM = {
  name: "",
  category: "",
  unit: "szt" as Unit,
  purchasePrice: 0,
  salePrice: 0,
  vatRate: 23 as VatRate,
  stockQuantity: 0,
  minStockLevel: 5,
  supplier: "",
  sku: "",
  description: "",
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = ["all", ...getCategories()];
  const lowStock = getLowStock();

  const filtered = materials.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.sku || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.supplier || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
      name: m.name,
      category: m.category,
      unit: m.unit,
      purchasePrice: m.purchasePrice,
      salePrice: m.salePrice,
      vatRate: m.vatRate,
      stockQuantity: m.stockQuantity,
      minStockLevel: m.minStockLevel,
      supplier: m.supplier || "",
      sku: m.sku || "",
      description: m.description || "",
    });
    setErrors({});
    setDialogOpen(true);
  }

  function handleSave() {
    const result = materialSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (editingId) {
      update(editingId, result.data);
      toast.success("Materiał zaktualizowany");
    } else {
      add(result.data);
      toast.success("Materiał dodany");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Materiał usunięty");
  }

  function handleExportCSV() {
    const headers = ["Nazwa", "Kategoria", "Jednostka", "Cena zakupu", "Cena sprzedaży", "VAT", "Stan", "Min. stan", "Dostawca", "SKU"];
    const rows = materials.map((m) => [
      m.name, m.category, UNIT_LABELS[m.unit], m.purchasePrice, m.salePrice, `${m.vatRate}%`, m.stockQuantity, m.minStockLevel, m.supplier || "", m.sku || ""
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "materialy.csv";
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
      const headers = lines[0].split(",");
      const nameIdx = headers.findIndex((h) => h.toLowerCase().includes("nazwa"));
      const catIdx = headers.findIndex((h) => h.toLowerCase().includes("kategoria"));
      const unitIdx = headers.findIndex((h) => h.toLowerCase().includes("jednostka"));
      const purchaseIdx = headers.findIndex((h) => h.toLowerCase().includes("cena zakupu"));
      const saleIdx = headers.findIndex((h) => h.toLowerCase().includes("cena sprzedaży"));
      const vatIdx = headers.findIndex((h) => h.toLowerCase().includes("vat"));
      const stockIdx = headers.findIndex((h) => h.toLowerCase().includes("stan"));
      const minStockIdx = headers.findIndex((h) => h.toLowerCase().includes("min"));
      const supplierIdx = headers.findIndex((h) => h.toLowerCase().includes("dostawca"));
      const skuIdx = headers.findIndex((h) => h.toLowerCase().includes("sku"));

      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const name = cols[nameIdx]?.trim();
        if (!name) continue;
        const unitMap: Record<string, Unit> = { "szt.": "szt", kg: "kg", m: "m", "m²": "m2", "godz.": "godz", "kpl.": "kpl", mb: "mb", komplet: "komplet" };
        const unit = unitMap[cols[unitIdx]?.trim()] || "szt";
        const vatStr = cols[vatIdx]?.trim().replace("%", "");
        const vatRate = [0, 8, 23].includes(parseInt(vatStr)) ? parseInt(vatStr) as VatRate : 23;
        await add({
          name,
          category: cols[catIdx]?.trim() || "Inne",
          unit,
          purchasePrice: parseFloat(cols[purchaseIdx]) || 0,
          salePrice: parseFloat(cols[saleIdx]) || 0,
          vatRate,
          stockQuantity: parseInt(cols[stockIdx]) || 0,
          minStockLevel: parseInt(cols[minStockIdx]) || 5,
          supplier: cols[supplierIdx]?.trim() || "",
          sku: cols[skuIdx]?.trim() || "",
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
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <motion.h1
                className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Materiały
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Magazyn, stany i ceny materiałów</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-300 hover:bg-accent hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm">
                <Upload className="h-4 w-4" />
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>
              <Button variant="outline" size="sm" className="btn-secondary" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                  <Plus className="h-4 w-4" />
                  Dodaj materiał
                </Button>
              </motion.div>
            </div>
          </div>
        </StaggerItem>

        {lowStock.length > 0 && (
          <StaggerItem>
            <Card className="card-modern border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">Niski stan magazynowy</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lowStock.map((m) => (
                    <Badge key={m.id} variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                      {m.name}: {m.stockQuantity} {UNIT_LABELS[m.unit]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Szukaj materiałów..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat === "all" ? "Wszystkie kategorie" : cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={5} />
              ) : filtered.length === 0 ? (
                <AnimatedEmptyState
                  icon={Package}
                  title={materials.length === 0 ? "Brak materiałów" : "Brak wyników"}
                  description={materials.length === 0 ? "Dodaj pierwszy materiał" : "Spróbuj zmienić kryteria wyszukiwania"}
                  action={materials.length === 0 ? (
                    <Button className="btn-primary" onClick={openAdd}>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj materiał
                    </Button>
                  ) : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa</TableHead>
                        <TableHead>Kategoria</TableHead>
                        <TableHead>Stan</TableHead>
                        <TableHead className="text-right">Cena zakupu</TableHead>
                        <TableHead className="text-right">Cena sprzedaży</TableHead>
                        <TableHead>VAT</TableHead>
                        <TableHead>Dostawca</TableHead>
                        <TableHead className="w-20">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filtered.map((m, index) => (
                          <motion.tr
                            key={m.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group border-b border-border/50 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell>
                              <div>
                                <div className="font-semibold">{m.name}</div>
                                {m.sku && <div className="text-xs text-muted-foreground font-mono">SKU: {m.sku}</div>}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{m.category}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={m.stockQuantity <= m.minStockLevel ? "text-amber-600 font-semibold" : ""}>
                                  {m.stockQuantity} {UNIT_LABELS[m.unit]}
                                </span>
                                {m.stockQuantity <= m.minStockLevel && (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(m.purchasePrice)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(m.salePrice)}</TableCell>
                            <TableCell><Badge variant="outline">{VAT_RATE_LABELS[m.vatRate]}</Badge></TableCell>
                            <TableCell className="text-muted-foreground text-sm">{m.supplier || "-"}</TableCell>
                            <TableCell>
                              <motion.div
                                className="flex gap-1"
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m.id!)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" />}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Usuń materiał</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Czy na pewno chcesz usunąć &ldquo;{m.name}&rdquo;?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(m.id!)}>Usuń</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </motion.div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj materiał" : "Nowy materiał"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nazwa materiału</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Kategoria</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="np. Rury, Baterie" />
                {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Jednostka</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as Unit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNIT_LABELS).map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>VAT</Label>
                <Select value={String(form.vatRate)} onValueChange={(v) => setForm({ ...form, vatRate: parseInt(v ?? "23") as VatRate })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VAT_RATE_LABELS).map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchasePrice">Cena zakupu (PLN)</Label>
                <Input id="purchasePrice" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })} />
                {errors.purchasePrice && <p className="text-destructive text-xs">{errors.purchasePrice}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salePrice">Cena sprzedaży (PLN)</Label>
                <Input id="salePrice" type="number" step="0.01" min="0" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: parseFloat(e.target.value) || 0 })} />
                {errors.salePrice && <p className="text-destructive text-xs">{errors.salePrice}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stockQuantity">Stan magazynowy</Label>
                <Input id="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: parseInt(e.target.value) || 0 })} />
                {errors.stockQuantity && <p className="text-destructive text-xs">{errors.stockQuantity}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStockLevel">Minimalny stan</Label>
                <Input id="minStockLevel" type="number" min="0" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: parseInt(e.target.value) || 0 })} />
                {errors.minStockLevel && <p className="text-destructive text-xs">{errors.minStockLevel}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier">Dostawca</Label>
              <Input id="supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Opis (opcjonalnie)</Label>
              <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj materiał"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
