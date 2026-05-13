"use client";

import { useState, useEffect } from "react";
import { useTimeStore } from "@/store/time-store";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Square, Plus, Trash2, Pencil, Clock, Timer, Search } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_LABELS: Record<string, string> = {
  robocizna: "Robocizna",
  dojazd: "Dojazd",
  inne: "Inne",
};

const EMPTY_FORM = {
  clientName: "",
  description: "",
  startTime: "",
  endTime: "",
  hourlyRate: 50,
  category: "robocizna" as const,
  notes: "",
};

export default function CzasPage() {
  const entries = useTimeStore((s) => s.entries);
  const loading = useTimeStore((s) => s.loading);
  const search = useTimeStore((s) => s.search);
  const categoryFilter = useTimeStore((s) => s.categoryFilter);
  const activeTimer = useTimeStore((s) => s.activeTimer);
  const setSearch = useTimeStore((s) => s.setSearch);
  const setCategoryFilter = useTimeStore((s) => s.setCategoryFilter);
  const startTimer = useTimeStore((s) => s.startTimer);
  const stopTimer = useTimeStore((s) => s.stopTimer);
  const add = useTimeStore((s) => s.add);
  const remove = useTimeStore((s) => s.remove);
  const getTotalHours = useTimeStore((s) => s.getTotalHours);
  const getTotalEarnings = useTimeStore((s) => s.getTotalEarnings);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [timerForm, setTimerForm] = useState({ clientName: "", description: "", hourlyRate: 50, category: "robocizna" as const });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const filtered = entries.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  async function handleStartTimer() {
    if (!timerForm.clientName || !timerForm.description) {
      toast.error("Wypełnij klienta i opis");
      return;
    }
    startTimer({
      clientName: timerForm.clientName,
      description: timerForm.description,
      hourlyRate: timerForm.hourlyRate,
      category: timerForm.category,
    });
    toast.success("Timer uruchomiony");
  }

  async function handleStopTimer() {
    const id = await stopTimer();
    if (id) {
      toast.success("Czas zapisany");
    }
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function handleAdd() {
    if (!form.clientName || !form.description || !form.startTime || !form.endTime) {
      toast.error("Wypełnij wymagane pola");
      return;
    }
    add({
      clientName: form.clientName,
      description: form.description,
      startTime: new Date(form.startTime),
      endTime: new Date(form.endTime),
      hourlyRate: form.hourlyRate,
      category: form.category,
      notes: form.notes || undefined,
    });
    toast.success("Czas dodany");
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Wpis usunięty");
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}min`;
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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
                Śledzenie czasu
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Logowanie godzin i czasu pracy</p>
            </div>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                  <Plus className="h-4 w-4" />
                  Dodaj wpis
                </Button>
              </motion.div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{getTotalHours()}h</div>
                    <div className="text-xs text-muted-foreground">Łączny czas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 shrink-0">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(getTotalEarnings())}</div>
                    <div className="text-xs text-muted-foreground">Łączna wartość</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 shrink-0">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{entries.length}</div>
                    <div className="text-xs text-muted-foreground">Wpisy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {activeTimer && (
          <StaggerItem>
            <Card className="card-modern border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="h-3 w-3 rounded-full bg-red-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <div>
                      <div className="font-semibold">{activeTimer.description}</div>
                      <div className="text-sm text-muted-foreground">{activeTimer.clientName} &middot; {formatCurrency(activeTimer.hourlyRate)}/h</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-mono font-bold">{formatElapsed(elapsed)}</div>
                    <Button variant="destructive" size="sm" onClick={handleStopTimer}>
                      <Square className="mr-2 h-4 w-4" />
                      Zatrzymaj
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {!activeTimer && (
          <StaggerItem>
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-blue-500" />Uruchom timer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input placeholder="Klient" value={timerForm.clientName} onChange={(e) => setTimerForm({ ...timerForm, clientName: e.target.value })} />
                  <Input placeholder="Opis" value={timerForm.description} onChange={(e) => setTimerForm({ ...timerForm, description: e.target.value })} />
                  <Input type="number" placeholder="Stawka/h" value={timerForm.hourlyRate} onChange={(e) => setTimerForm({ ...timerForm, hourlyRate: parseFloat(e.target.value) || 0 })} className="w-24" />
                  <Select value={timerForm.category} onValueChange={(v) => setTimerForm({ ...timerForm, category: v as typeof timerForm.category })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Button className="btn-primary" onClick={handleStartTimer}>
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </Button>
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
                  <Input placeholder="Szukaj wpisów..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie kategorie</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" /></div>
              ) : filtered.length === 0 ? (
                <AnimatedEmptyState
                  icon={Clock}
                  title={entries.length === 0 ? "Brak wpisów" : "Brak wyników"}
                  description={entries.length === 0 ? "Uruchom timer lub dodaj wpis ręcznie" : "Spróbuj zmienić kryteria wyszukiwania"}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Klient</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Czas</TableHead>
                        <TableHead>Stawka/h</TableHead>
                        <TableHead className="text-right">Koszt</TableHead>
                        <TableHead>Kategoria</TableHead>
                        <TableHead className="w-10">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filtered.map((e, index) => (
                          <motion.tr
                            key={e.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group border-b border-border/50 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell className="font-semibold">{e.clientName}</TableCell>
                            <TableCell>{e.description}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(e.startTime), "dd.MM.yyyy HH:mm", { locale: pl })}
                            </TableCell>
                            <TableCell><Badge variant="outline">{formatDuration(e.durationMinutes)}</Badge></TableCell>
                            <TableCell>{formatCurrency(e.hourlyRate)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(e.totalCost)}</TableCell>
                            <TableCell><Badge variant="outline">{CATEGORY_LABELS[e.category]}</Badge></TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Usuń wpis</AlertDialogTitle>
                                    <AlertDialogDescription>Czy na pewno chcesz usunąć ten wpis?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(e.id!)}>Usuń</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
            <DialogTitle>Dodaj wpis czasu</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Klient</Label>
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Opis</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Rozpoczęcie</Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Zakończenie</Label>
                <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stawka godzinowa (PLN)</Label>
                <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Kategoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Uwagi</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button className="btn-primary" onClick={handleAdd}>Dodaj wpis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
