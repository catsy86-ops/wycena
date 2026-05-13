"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/store/template-store";
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
import { Plus, Pencil, Trash2, Search, ClipboardList, FileText, Package, ArrowLeft, ArrowUp, ArrowDown, Settings2, Calculator, Info } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function generateItemId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function createEmptyItem(defaultVatRate: VatRate = 8): QuoteItem {
  return calcQuoteItem({
    id: generateItemId(),
    name: "",
    quantity: 1,
    unit: "szt" as Unit,
    priceNettoPerUnit: 0,
    vatRate: defaultVatRate,
    discountPercent: 0,
    nettotal: 0,
    vatAmount: 0,
    bruttoTotal: 0,
  });
}

function createEmptyCost(): QuoteAdditionalCost {
  return {
    id: generateItemId(),
    name: "",
    amount: 0,
    vatRate: 8,
    category: "inne",
  };
}

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  defaultDiscountPercent: 0,
};

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
  const incrementUsage = useTemplateStore((s) => s.incrementUsage);

  const services = useServiceStore((s) => s.services);
  const materials = useMaterialStore((s) => s.materials);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateItems, setTemplateItems] = useState<QuoteItem[]>([]);
  const [templateCosts, setTemplateCosts] = useState<QuoteAdditionalCost[]>([]);
  const [pricingModel, setPricingModel] = useState<PricingModelConfig>(DEFAULT_PRICING_MODEL);
  const [activeTab, setActiveTab] = useState("basic");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);

  const categories = useMemo(() => ["all", ...new Set(templates.map((t) => t.category))], [templates]);

  const filtered = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const templateTotalNetto = templateItems.reduce((s, i) => s + i.nettotal, 0);
  const templateTotalBrutto = templateItems.reduce((s, i) => s + i.bruttoTotal, 0) + templateCosts.reduce((s, c) => s + c.amount * (1 + c.vatRate / 100), 0);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setTemplateItems([]);
    setTemplateCosts([]);
    setPricingModel(DEFAULT_PRICING_MODEL);
    setActiveTab("basic");
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setForm({
      name: t.name,
      description: t.description || "",
      category: t.category,
      defaultDiscountPercent: t.defaultDiscountPercent,
    });
    setTemplateItems(t.items || []);
    setTemplateCosts(t.additionalCosts || []);
    setPricingModel(t.pricingModel || DEFAULT_PRICING_MODEL);
    setErrors({});
    setActiveTab("basic");
    setDialogOpen(true);
  }

  function handleSave() {
    const result = quoteTemplateSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (editingId) {
      update(editingId, { ...result.data, items: templateItems, additionalCosts: templateCosts, pricingModel });
      toast.success("Szablon zaktualizowany");
    } else {
      add({ ...result.data, items: templateItems, additionalCosts: templateCosts, pricingModel });
      toast.success("Szablon dodany");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Szablon usunięty");
  }

  function handleUseTemplate(id: number) {
    incrementUsage(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      const params = new URLSearchParams();
      params.set("templateId", String(id));
      router.push(`/wyceny/nowa?${params.toString()}`);
    }
  }

  function updateTemplateItem(id: string, updates: Partial<QuoteItem>) {
    setTemplateItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        return calcQuoteItem(updated);
      })
    );
  }

  function addTemplateItem() {
    setTemplateItems((prev) => [...prev, createEmptyItem(8)]);
  }

  function removeTemplateItem(id: string) {
    setTemplateItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addServiceToTemplate(serviceId: number) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    const newItem = calcQuoteItem({
      id: generateItemId(),
      serviceId: service.id,
      name: service.name,
      quantity: 1,
      unit: service.unit,
      priceNettoPerUnit: service.priceNetto,
      vatRate: service.vatRate,
      discountPercent: 0,
      nettotal: 0,
      vatAmount: 0,
      bruttoTotal: 0,
    });
    setTemplateItems((prev) => [...prev, newItem]);
    setServiceDialogOpen(false);
  }

  function addMaterialToTemplate(materialId: number) {
    const material = materials.find((m) => m.id === materialId);
    if (!material) return;
    const newItem = calcQuoteItem({
      id: generateItemId(),
      name: material.name,
      quantity: 1,
      unit: material.unit,
      priceNettoPerUnit: material.salePrice,
      vatRate: material.vatRate,
      discountPercent: 0,
      nettotal: 0,
      vatAmount: 0,
      bruttoTotal: 0,
    });
    setTemplateItems((prev) => [...prev, newItem]);
    setMaterialDialogOpen(false);
  }

  function updateTemplateCost(id: string, updates: Partial<QuoteAdditionalCost>) {
    setTemplateCosts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function addTemplateCost() {
    setTemplateCosts((prev) => [...prev, createEmptyCost()]);
  }

  function removeTemplateCost(id: string) {
    setTemplateCosts((prev) => prev.filter((c) => c.id !== id));
  }

  function moveItem(index: number, direction: "up" | "down") {
    const newItems = [...templateItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setTemplateItems(newItems);
  }

  function updatePricingModelField(field: keyof PricingModelConfig, value: number) {
    setPricingModel((prev) => ({ ...prev, [field]: value }));
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
                Szablony wycen
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Predefiniowane zestawy usług do szybkiego tworzenia wycen</p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Nowy szablon
              </Button>
            </motion.div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Szukaj szablonów..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
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
                  icon={ClipboardList}
                  title={templates.length === 0 ? "Brak szablonów" : "Brak wyników"}
                  description={templates.length === 0 ? "Utwórz pierwszy szablon wyceny" : "Spróbuj zmienić kryteria wyszukiwania"}
                  action={templates.length === 0 ? (
                    <Button className="btn-primary" onClick={openAdd}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nowy szablon
                    </Button>
                  ) : undefined}
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {filtered.map((t, index) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="card-modern group cursor-pointer hover:shadow-lg transition-all duration-300">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base">{t.name}</CardTitle>
                              <Badge variant="outline">{t.category}</Badge>
                            </div>
                            <CardDescription className="line-clamp-2">{t.description || "Brak opisu"}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                              <span>Użyć: {t.usageCount}</span>
                              <span>Pozycji: {(t.items || []).length}</span>
                              {t.defaultDiscountPercent > 0 && (
                                <span>Rabat: {t.defaultDiscountPercent}%</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button className="btn-primary flex-1" size="sm" onClick={() => handleUseTemplate(t.id!)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Użyj
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t.id!)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" />}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Usuń szablon</AlertDialogTitle>
                                    <AlertDialogDescription>Czy na pewno chcesz usunąć szablon &ldquo;{t.name}&rdquo;?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(t.id!)}>Usuń</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj szablon" : "Nowy szablon"}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Podstawowe</TabsTrigger>
              <TabsTrigger value="items">Pozycje ({templateItems.length})</TabsTrigger>
              <TabsTrigger value="costs">Koszty ({templateCosts.length})</TabsTrigger>
              <TabsTrigger value="pricing">Model wyceny</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nazwa szablonu</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Kategoria</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="np. Łazienka, Kuchnia" />
                {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Opis</Label>
                <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opis szablonu..." rows={3} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount">Domyślny rabat (%)</Label>
                <Input id="discount" type="number" min="0" max="100" value={form.defaultDiscountPercent} onChange={(e) => setForm({ ...form, defaultDiscountPercent: parseInt(e.target.value) || 0 })} />
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                  <Button variant="outline" size="sm" className="btn-secondary">
                    <Package className="mr-2 h-4 w-4" />
                    Dodaj z usług
                  </Button>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Wybierz usługi z katalogu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {services.map((s) => (
                        <motion.button
                          key={s.id}
                          onClick={() => addServiceToTemplate(s.id!)}
                          className="flex w-full items-center justify-between rounded-xl border p-4 hover:bg-accent/50 transition-colors text-left"
                          whileHover={{ x: 4 }}
                        >
                          <div>
                            <div className="font-semibold text-sm">{s.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{UNIT_LABELS[s.unit]} &middot; VAT {s.vatRate}%</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(s.priceNetto)}</div>
                            <div className="text-xs text-muted-foreground">netto/jedn.</div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
                  <Button variant="outline" size="sm" className="btn-secondary">
                    <Package className="mr-2 h-4 w-4" />
                    Dodaj z materiałów
                  </Button>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Wybierz materiały z katalogu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {materials.map((m) => (
                        <motion.button
                          key={m.id}
                          onClick={() => addMaterialToTemplate(m.id!)}
                          className="flex w-full items-center justify-between rounded-xl border p-4 hover:bg-accent/50 transition-colors text-left"
                          whileHover={{ x: 4 }}
                        >
                          <div>
                            <div className="font-semibold text-sm">{m.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{UNIT_LABELS[m.unit]} &middot; Stan: {m.stockQuantity}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(m.salePrice)}</div>
                            <div className="text-xs text-muted-foreground">netto/jedn.</div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="sm" className="btn-secondary" onClick={addTemplateItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj ręcznie
                </Button>
              </div>

              {templateItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Brak pozycji. Dodaj pozycje z katalogu lub ręcznie.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-48">Nazwa</TableHead>
                        <TableHead className="w-20">Ilość</TableHead>
                        <TableHead className="w-28">Jedn.</TableHead>
                        <TableHead className="w-28">Cena netto</TableHead>
                        <TableHead className="w-24">VAT</TableHead>
                        <TableHead className="w-24">Rabat %</TableHead>
                        <TableHead className="text-right w-28">Netto</TableHead>
                        <TableHead className="text-right w-28">Brutto</TableHead>
                        <TableHead className="w-20">Kolejność</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input value={item.name} onChange={(e) => updateTemplateItem(item.id, { name: e.target.value })} placeholder="Nazwa usługi" className="h-9" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateTemplateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} className="h-9" />
                          </TableCell>
                          <TableCell>
                            <Select value={item.unit} onValueChange={(v) => updateTemplateItem(item.id, { unit: (v ?? "szt") as Unit })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(UNIT_LABELS).map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.01" value={item.priceNettoPerUnit} onChange={(e) => updateTemplateItem(item.id, { priceNettoPerUnit: parseFloat(e.target.value) || 0 })} className="h-9" />
                          </TableCell>
                          <TableCell>
                            <Select value={String(item.vatRate)} onValueChange={(v) => updateTemplateItem(item.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(VAT_RATE_LABELS).map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" max="100" value={item.discountPercent} onChange={(e) => updateTemplateItem(item.id, { discountPercent: parseFloat(e.target.value) || 0 })} className="h-9" />
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.nettotal)}</TableCell>
                          <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(item.bruttoTotal)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(index, "up")} disabled={index === 0}>
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(index, "down")} disabled={index === templateItems.length - 1}>
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeTemplateItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end gap-4 text-sm font-semibold pt-2 border-t">
                <span>Suma netto: {formatCurrency(templateTotalNetto)}</span>
                <span className="text-blue-600 dark:text-blue-400">Suma brutto: {formatCurrency(templateTotalBrutto)}</span>
              </div>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4 mt-4">
              <Button variant="outline" size="sm" className="btn-secondary" onClick={addTemplateCost}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj koszt dodatkowy
              </Button>

              {templateCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Brak kosztów dodatkowych.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-48">Nazwa</TableHead>
                        <TableHead className="w-32">Kategoria</TableHead>
                        <TableHead className="w-28">Kwota</TableHead>
                        <TableHead className="w-24">VAT</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templateCosts.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>
                            <Input value={cost.name} onChange={(e) => updateTemplateCost(cost.id, { name: e.target.value })} placeholder="Nazwa kosztu" className="h-9" />
                          </TableCell>
                          <TableCell>
                            <Select value={cost.category} onValueChange={(v) => updateTemplateCost(cost.id, { category: v as QuoteAdditionalCost["category"] })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dojazd">Dojazd</SelectItem>
                                <SelectItem value="materialy">Materiały</SelectItem>
                                <SelectItem value="sprzet">Sprzęt</SelectItem>
                                <SelectItem value="inne">Inne</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.01" value={cost.amount} onChange={(e) => updateTemplateCost(cost.id, { amount: parseFloat(e.target.value) || 0 })} className="h-9" />
                          </TableCell>
                          <TableCell>
                            <Select value={String(cost.vatRate)} onValueChange={(v) => updateTemplateCost(cost.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(VAT_RATE_LABELS).map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeTemplateCost(cost.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Zaawansowany model wyceny</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Model uniwersytecki uwzględniający złożoność, ryzyko, koszty pośrednie, inflację i inne czynniki.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Mnożnik złożoności
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">1.0 = standard, 2.0 = bardzo złożony</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="1" max="2" step="0.1" value={pricingModel.complexityFactor} onChange={(e) => updatePricingModelField("complexityFactor", parseFloat(e.target.value) || 1)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Margines ryzyka (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Rezerwa na nieprzewidziane problemy (0-30%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="30" value={pricingModel.riskMargin} onChange={(e) => updatePricingModelField("riskMargin", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Koszty pośrednie (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Zarządzanie, biuro, administracja (0-50%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="50" value={pricingModel.overheadPercent} onChange={(e) => updatePricingModelField("overheadPercent", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Marża zysku (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Docelowa marża zysku (0-50%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="50" value={pricingModel.profitMarginPercent} onChange={(e) => updatePricingModelField("profitMarginPercent", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Waloryzacja/inflacja (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Dostosowanie do inflacji (0-20%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="20" value={pricingModel.inflationAdjustment} onChange={(e) => updatePricingModelField("inflationAdjustment", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Mnożnik pilności
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">1.0 = standard, 3.0 = bardzo pilne</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="1" max="3" step="0.1" value={pricingModel.urgencyMultiplier} onChange={(e) => updatePricingModelField("urgencyMultiplier", parseFloat(e.target.value) || 1)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Minimalna marża (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Gwarantowana minimalna marża (0-50%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="50" value={pricingModel.minimumMarginPercent} onChange={(e) => updatePricingModelField("minimumMarginPercent", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Mnożnik robocizny
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">1.0 = bazowy, 3.0 = specjalistyczna</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="1" max="3" step="0.1" value={pricingModel.laborCostMultiplier} onChange={(e) => updatePricingModelField("laborCostMultiplier", parseFloat(e.target.value) || 1)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Straty materiałowe (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Rezerwa na odpady/uszkodzenia (0-30%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="30" value={pricingModel.materialWastePercent} onChange={(e) => updatePricingModelField("materialWastePercent", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Koszt sprzętu (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Amortyzacja/wynajem sprzętu (0-20%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="20" value={pricingModel.equipmentCostPercent} onChange={(e) => updatePricingModelField("equipmentCostPercent", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label>Koszt dojazdu (PLN/km)</Label>
                  <Input type="number" min="0" step="0.1" value={pricingModel.travelCostPerKm} onChange={(e) => updatePricingModelField("travelCostPerKm", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label>Szacowany dystans (km)</Label>
                  <Input type="number" min="0" value={pricingModel.estimatedDistanceKm} onChange={(e) => updatePricingModelField("estimatedDistanceKm", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label>Koszt pozwoleń/uzgodnień (PLN)</Label>
                  <Input type="number" min="0" value={pricingModel.permitCosts} onChange={(e) => updatePricingModelField("permitCosts", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Ubezpieczenie (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Koszt ubezpieczenia OC (0-10%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="10" value={pricingModel.insuranceCostPercent} onChange={(e) => updatePricingModelField("insuranceCostPercent", parseFloat(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label>Okres gwarancji (miesiące)</Label>
                  <Input type="number" min="0" max="60" value={pricingModel.warrantyPeriodMonths} onChange={(e) => updatePricingModelField("warrantyPeriodMonths", parseInt(e.target.value) || 0)} />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    Rezerwa gwarancyjna (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs">Rezerwa na naprawy gwarancyjne (0-10%)</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input type="number" min="0" max="10" value={pricingModel.warrantyReservePercent} onChange={(e) => updatePricingModelField("warrantyReservePercent", parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 mt-4">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Podsumowanie modelu wyceny</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Złożoność:</div>
                    <div className="font-semibold">{pricingModel.complexityFactor.toFixed(1)}x</div>
                    <div className="text-muted-foreground">Ryzyko:</div>
                    <div className="font-semibold">{pricingModel.riskMargin}%</div>
                    <div className="text-muted-foreground">Marża zysku:</div>
                    <div className="font-semibold">{pricingModel.profitMarginPercent}%</div>
                    <div className="text-muted-foreground">Pilność:</div>
                    <div className="font-semibold">{pricingModel.urgencyMultiplier.toFixed(1)}x</div>
                    <div className="text-muted-foreground">Minimalna marża:</div>
                    <div className="font-semibold">{pricingModel.minimumMarginPercent}%</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj szablon"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
