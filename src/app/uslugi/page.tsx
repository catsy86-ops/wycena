"use client";

import { useState, useRef, useEffect } from "react";
import { useServiceStore } from "@/store/service-store";
import { CATEGORY_LABELS, type ServiceCategory, type VatRate, VAT_RATE_LABELS, type Unit, UNIT_LABELS } from "@/types";
import { serviceSchema } from "@/lib/validators";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Package, Check, X } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const EMPTY_FORM = {
  name: "",
  category: "montaz" as ServiceCategory,
  unit: "szt" as Unit,
  priceNetto: 0,
  vatRate: 8 as VatRate,
  description: "",
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  montaz: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  naprawa: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wymiana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  czyszczenie: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  diagnoza: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  materialy: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  inne: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlinePrice, setInlinePrice] = useState(0);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineEditId && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineEditId]);

  function startInlineEdit(id: number, currentPrice: number) {
    setInlineEditId(id);
    setInlinePrice(currentPrice);
  }

  function cancelInlineEdit() {
    setInlineEditId(null);
    setInlinePrice(0);
  }

  function saveInlineEdit(id: number) {
    const price = Math.max(0, inlinePrice);
    update(id, { priceNetto: price });
    toast.success("Cena zaktualizowana");
    cancelInlineEdit();
  }

  function handleInlineKeyDown(e: React.KeyboardEvent, id: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveInlineEdit(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelInlineEdit();
    }
  }

  const filtered = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
    setForm({ name: s.name, category: s.category, unit: s.unit, priceNetto: s.priceNetto, vatRate: s.vatRate, description: s.description || "" });
    setErrors({});
    setDialogOpen(true);
  }

  function handleSave() {
    const result = serviceSchema.safeParse(form);
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
      toast.success("Usługa zaktualizowana");
    } else {
      add(result.data);
      toast.success("Usługa dodana");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Usługa usunięta");
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
                Katalog usług
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Zarządzaj usługami i cenami</p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Dodaj usługę
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
                  <Input placeholder="Szukaj usług..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter((v ?? "all") as ServiceCategory | "all")}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie kategorie</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
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
                  title={services.length === 0 ? "Brak usług" : "Brak wyników"}
                  description={services.length === 0 ? "Dodaj pierwszą usługę do katalogu" : "Spróbuj zmienić kryteria wyszukiwania"}
                  action={services.length === 0 ? (
                    <Button className="btn-primary" onClick={openAdd}>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj usługę
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
                        <TableHead>Jedn.</TableHead>
                        <TableHead className="text-right">Cena netto</TableHead>
                        <TableHead>VAT</TableHead>
                        <TableHead className="text-right">Cena brutto</TableHead>
                        <TableHead className="w-20">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filtered.map((s, index) => (
                          <motion.tr
                            key={s.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group border-b border-border/50 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell>
                              <div>
                                <div className="font-semibold">{s.name}</div>
                                {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <motion.div whileHover={{ scale: 1.05 }}>
                                <Badge className={CATEGORY_COLORS[s.category]}>{CATEGORY_LABELS[s.category]}</Badge>
                              </motion.div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{UNIT_LABELS[s.unit]}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(s.priceNetto)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{VAT_RATE_LABELS[s.vatRate]}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(s.priceNetto * (1 + s.vatRate / 100))}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s.id!)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Usuń usługę</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Czy na pewno chcesz usunąć &ldquo;{s.name}&rdquo;?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(s.id!)}>Usuń</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj usługę" : "Nowa usługa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa usługi</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Kategoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: (v ?? "montaz") as ServiceCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Jednostka</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: (v ?? "szt") as Unit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNIT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Cena netto (PLN)</Label>
                <Input id="price" type="number" step="0.01" min="0" value={form.priceNetto} onChange={(e) => setForm({ ...form, priceNetto: parseFloat(e.target.value) || 0 })} />
                {errors.priceNetto && <p className="text-destructive text-xs">{errors.priceNetto}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Stawka VAT</Label>
                <Select value={String(form.vatRate)} onValueChange={(v) => setForm({ ...form, vatRate: parseInt(v ?? "8") as VatRate })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VAT_RATE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Opis (opcjonalnie)</Label>
              <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Anuluj
            </DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj usługę"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
