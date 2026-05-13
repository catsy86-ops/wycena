"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuoteStore } from "@/store/quote-store";
import { STATUS_LABELS, type QuoteStatus } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Copy, FileText, Send, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  szkic: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wyslana: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  zaakceptowana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  odrzucona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export default function WycenyPage() {
  const quotes = useQuoteStore((s) => s.quotes);
  const loading = useQuoteStore((s) => s.loading);
  const search = useQuoteStore((s) => s.search);
  const statusFilter = useQuoteStore((s) => s.statusFilter);
  const setSearch = useQuoteStore((s) => s.setSearch);
  const setStatusFilter = useQuoteStore((s) => s.setStatusFilter);
  const remove = useQuoteStore((s) => s.remove);
  const changeStatus = useQuoteStore((s) => s.changeStatus);
  const duplicate = useQuoteStore((s) => s.duplicate);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = quotes.filter((q) => {
    const matchesSearch =
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleDuplicate(id: number) {
    await duplicate(id);
    toast.success("Wycena zduplikowana");
  }

  function handleDelete() {
    if (deleteId) {
      remove(deleteId);
      toast.success("Wycena usunięta");
      setDeleteId(null);
    }
  }

  const deleteQuote = deleteId ? quotes.find((q) => q.id === deleteId) : null;

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
                Wyceny
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Zarządzaj wycenami i ofertami</p>
            </div>
            <Link href="/wyceny/nowa">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-primary w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Nowa wycena
                </Button>
              </motion.div>
            </Link>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Szukaj wycen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as QuoteStatus | "all")}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie statusy</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
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
                  icon={FileText}
                  title={quotes.length === 0 ? "Brak wycen" : "Brak wyników"}
                  description={quotes.length === 0 ? "Utwórz pierwszą wycenę!" : "Spróbuj zmienić kryteria wyszukiwania"}
                  action={quotes.length === 0 ? (
                    <Link href="/wyceny/nowa">
                      <Button className="btn-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Nowa wycena
                      </Button>
                    </Link>
                  ) : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numer</TableHead>
                        <TableHead>Klient</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Brutto</TableHead>
                        <TableHead className="w-12">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filtered.map((q, index) => (
                          <motion.tr
                            key={q.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => window.location.href = `/wyceny/${q.id}`}
                          >
                            <TableCell className="font-semibold">{q.number}</TableCell>
                            <TableCell>{q.clientName || <span className="text-muted-foreground">Brak klienta</span>}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}
                            </TableCell>
                            <TableCell>
                              <motion.div whileHover={{ scale: 1.05 }}>
                                <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                              </motion.div>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(q.totalNetto)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(q.totalBrutto)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                    <Link href={`/wyceny/${q.id}`} className="flex items-center gap-2 w-full">
                                      <Copy className="h-3.5 w-3.5" /> Podgląd
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(q.id!); }}>
                                    <Copy className="h-3.5 w-3.5" /> Duplikuj
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {q.status === "szkic" && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); changeStatus(q.id!, "wyslana"); toast.success("Status zmieniony"); }}>
                                      <Send className="h-3.5 w-3.5" /> Oznacz jako wysłana
                                    </DropdownMenuItem>
                                  )}
                                  {(q.status === "szkic" || q.status === "wyslana") && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); changeStatus(q.id!, "zaakceptowana"); toast.success("Status zmieniony"); }}>
                                      <Check className="h-3.5 w-3.5" /> Zaakceptowana
                                    </DropdownMenuItem>
                                  )}
                                  {(q.status === "szkic" || q.status === "wyslana") && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); changeStatus(q.id!, "odrzucona"); toast.success("Status zmieniony"); }}>
                                      <X className="h-3.5 w-3.5" /> Odrzucona
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(q.id!); }}>
                                    <X className="h-3.5 w-3.5" /> Usuń
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń wycenę</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć wycenę{deleteQuote ? ` "${deleteQuote.number}"` : ""}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
