"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/store/template-store";
import { useServiceStore } from "@/store/service-store";
import { quoteTemplateSchema } from "@/lib/validators";
import { UNIT_LABELS, VAT_RATE_LABELS, type VatRate, type Unit } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, ClipboardList, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = ["all", ...new Set(templates.map((t) => t.category))];

  const filtered = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
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
    setErrors({});
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
      update(editingId, result.data);
      toast.success("Szablon zaktualizowany");
    } else {
      add({ ...result.data, items: [], additionalCosts: [] });
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
    toast.success("Szablon użyty");
    router.push("/wyceny/nowa");
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj szablon" : "Nowy szablon"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discount">Domyślny rabat (%)</Label>
              <Input id="discount" type="number" min="0" max="100" value={form.defaultDiscountPercent} onChange={(e) => setForm({ ...form, defaultDiscountPercent: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj szablon"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
