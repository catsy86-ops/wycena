"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { clientSchema } from "@/lib/validators";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Phone, Users, Mail, MapPin, FileText, ExternalLink, ChevronUp, ChevronDown, Building2, Copy, Download, Upload, CheckSquare, Star, AlertTriangle, UserPlus, Clock, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { sanitizeCsvCell } from "@/lib/utils";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY_FORM = { name: "", phone: "", email: "", address: "", nip: "", notes: "", tags: "" };

type SortKey = "name" | "phone" | "email" | "createdAt" | "revenue" | "quoteCount";
type SortDir = "asc" | "desc";

const SEGMENT_BADGES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  vip: { label: "VIP", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300", icon: <Star className="h-2.5 w-2.5" /> },
  staly: { label: "Stały", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300", icon: <CheckSquare className="h-2.5 w-2.5" /> },
  nowy: { label: "Nowy", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300", icon: <UserPlus className="h-2.5 w-2.5" /> },
  nieaktywny: { label: "Nieaktywny", className: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 border-red-300", icon: <Clock className="h-2.5 w-2.5" /> },
};

function SegmentBadge({ segment }: { segment: string }) {
  const badge = SEGMENT_BADGES[segment];
  if (!badge) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0 text-[10px] font-semibold border ${badge.className}`}>
      {badge.icon}{badge.label}
    </span>
  );
}

const TAG_COLORS = ["bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300", "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300"];

function getTagColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ["from-blue-500 to-indigo-600", "from-violet-500 to-purple-600", "from-emerald-500 to-green-600", "from-amber-500 to-orange-600", "from-pink-500 to-rose-600", "from-cyan-500 to-teal-600"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function validateNIP(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + parseInt(nip[i]) * w, 0);
  return sum % 11 === parseInt(nip[9]);
}

export default function KlienciPage() {
  const clients = useClientStore((s) => s.clients);
  const loading = useClientStore((s) => s.loading);
  const search = useClientStore((s) => s.search);
  const setSearch = useClientStore((s) => s.setSearch);
  const add = useClientStore((s) => s.add);
  const update = useClientStore((s) => s.update);
  const remove = useClientStore((s) => s.remove);
  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [nipDuplicate, setNipDuplicate] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [tagFilter, setTagFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<"all" | "vip" | "staly" | "nowy" | "nieaktywny">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginatedClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedClients.map((c) => c.id!)));
    }
  }

  function bulkDelete() {
    selectedIds.forEach((id) => remove(id));
    toast.success(`Usunięto ${selectedIds.size} klientów`);
    setSelectedIds(new Set());
  }

  function bulkAddTag(tag: string) {
    selectedIds.forEach((id) => {
      const c = clients.find((x) => x.id === id);
      if (c) {
        const existingTags = c.tags ? c.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
        if (!existingTags.includes(tag)) {
          update(id, { tags: [...existingTags, tag].join(", ") });
        }
      }
    });
    toast.success(`Dodano tag "${tag}" do ${selectedIds.size} klientów`);
    setSelectedIds(new Set());
  }

  function bulkExportCSV() {
    const selected = clients.filter((c) => selectedIds.has(c.id!));
    const headers = ["Nazwa", "Telefon", "Email", "Adres", "NIP", "Notatki", "Tagi"];
    const rows = selected.map((c) => [c.name, c.phone, c.email || "", c.address || "", c.nip || "", c.notes || "", c.tags || ""]);
    const csvContent = [headers.map(sanitizeCsvCell).join(";"), ...rows.map((r) => r.map(sanitizeCsvCell).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `klienci-wybrani-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Wyeksportowano ${selectedIds.size} klientów`);
  }

  // Wykrywanie duplikatów
  const duplicateWarnings = useMemo(() => {
    const warnings: Record<number, string[]> = {};
    clients.forEach((c) => {
      const dupes: string[] = [];
      if (c.nip) {
        const nipDupes = clients.filter((x) => x.id !== c.id && x.nip === c.nip);
        if (nipDupes.length > 0) dupes.push(`NIP: ${nipDupes.map((x) => x.name).join(", ")}`);
      }
      if (c.phone) {
        const phoneDupes = clients.filter((x) => x.id !== c.id && x.phone === c.phone);
        if (phoneDupes.length > 0) dupes.push(`Tel: ${phoneDupes.map((x) => x.name).join(", ")}`);
      }
      if (c.email) {
        const emailDupes = clients.filter((x) => x.id !== c.id && x.email && x.email.toLowerCase() === c.email!.toLowerCase());
        if (emailDupes.length > 0) dupes.push(`Email: ${emailDupes.map((x) => x.name).join(", ")}`);
      }
      if (dupes.length > 0) warnings[c.id!] = dupes;
    });
    return warnings;
  }, [clients]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const clientStats = useMemo(() => {
    const stats: Record<number, { quoteCount: number; totalRevenue: number; lastQuoteDate: Date | null }> = {};
    quotes.forEach((q) => {
      if (q.clientId) {
        if (!stats[q.clientId]) {
          stats[q.clientId] = { quoteCount: 0, totalRevenue: 0, lastQuoteDate: null };
        }
        stats[q.clientId].quoteCount += 1;
        if (q.status === "zaakceptowana") {
          stats[q.clientId].totalRevenue += q.totalBrutto;
        }
        const d = new Date(q.createdAt);
        if (!stats[q.clientId].lastQuoteDate || d > stats[q.clientId].lastQuoteDate!) {
          stats[q.clientId].lastQuoteDate = d;
        }
      }
    });
    return stats;
  }, [quotes]);

  // Segmentacja klientów
  const clientSegments = useMemo(() => {
    const now = new Date();
    const segments: Record<number, "vip" | "staly" | "nowy" | "nieaktywny" | "normal"> = {};
    clients.forEach((c) => {
      const stats = clientStats[c.id!];
      const daysSinceCreated = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / 86400000);
      const daysSinceLastQuote = stats?.lastQuoteDate ? Math.floor((now.getTime() - new Date(stats.lastQuoteDate).getTime()) / 86400000) : null;

      if (stats?.totalRevenue > 10000) segments[c.id!] = "vip";
      else if (stats?.quoteCount >= 3) segments[c.id!] = "staly";
      else if (daysSinceCreated < 30) segments[c.id!] = "nowy";
      else if (daysSinceLastQuote === null || daysSinceLastQuote > 90) segments[c.id!] = "nieaktywny";
      else segments[c.id!] = "normal";
    });
    return segments;
  }, [clients, clientStats]);

  // Wszystkie tagi
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clients.forEach((c) => {
      if (c.tags) c.tags.split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => tags.add(t));
    });
    return Array.from(tags);
  }, [clients]);

  const filtered = useMemo(() => {
    let result = clients.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.nip || "").includes(search);

      // Filtr po tagu
      let matchesTag = true;
      if (tagFilter) {
        const clientTags = c.tags ? c.tags.split(",").map((t) => t.trim()) : [];
        matchesTag = clientTags.includes(tagFilter);
      }

      // Filtr po segmencie
      let matchesSegment = true;
      if (segmentFilter !== "all") {
        matchesSegment = clientSegments[c.id!] === segmentFilter;
      }

      return matchesSearch && matchesTag && matchesSegment;
    });

    result.sort((a, b) => {
      let cmp = 0;
      const statsA = clientStats[a.id!] || { quoteCount: 0, totalRevenue: 0 };
      const statsB = clientStats[b.id!] || { quoteCount: 0, totalRevenue: 0 };
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "phone": cmp = a.phone.localeCompare(b.phone); break;
        case "email": cmp = (a.email || "").localeCompare(b.email || ""); break;
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case "revenue": cmp = statsA.totalRevenue - statsB.totalRevenue; break;
        case "quoteCount": cmp = statsA.quoteCount - statsB.quoteCount; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [clients, search, sortKey, sortDir, tagFilter, segmentFilter, clientStats, clientSegments]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setNipDuplicate(false);
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setEditingId(id);
    setForm({ name: c.name, phone: c.phone, email: c.email || "", address: c.address || "", nip: c.nip || "", notes: c.notes || "", tags: c.tags || "" });
    setErrors({});
    setNipDuplicate(false);
    setDialogOpen(true);
  }

  function handleNipChange(value: string) {
    setForm({ ...form, nip: value });
    if (value.length === 10) {
      const exists = clients.some((c) => c.nip === value && c.id !== editingId);
      setNipDuplicate(exists);
    } else {
      setNipDuplicate(false);
    }
  }

  function handleSave() {
    if (form.nip && !validateNIP(form.nip)) {
      setErrors({ nip: "Nieprawidłowy numer NIP (10 cyfr)" });
      return;
    }
    if (nipDuplicate) {
      setErrors({ nip: "Klient z tym NIP już istnieje" });
      return;
    }
    const result = clientSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (editingId) {
      update(editingId, { ...result.data, notes: form.notes, tags: form.tags });
      toast.success("Klient zaktualizowany");
    } else {
      add({ ...result.data, notes: form.notes, tags: form.tags });
      toast.success("Klient dodany");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Klient usunięty");
  }

  function exportToCSV() {
    const headers = ["Nazwa", "Telefon", "Email", "Adres", "NIP", "Notatki", "Tagi"];
    const rows = filtered.map((c) => [c.name, c.phone, c.email || "", c.address || "", c.nip || "", c.notes || "", c.tags || ""]);
    const csvContent = [headers.map(sanitizeCsvCell).join(";"), ...rows.map((r) => r.map(sanitizeCsvCell).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `klienci-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Klienci wyeksportowani bezpiecznie do CSV");
  }

  function importFromCSV(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("Plik CSV jest pusty");
          return;
        }
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/(".*?"|[^;]+)/g)?.map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
          if (values.length >= 2) {
            add({ name: values[0], phone: values[1], email: values[2] || "", address: values[3] || "", nip: values[4] || "", notes: values[5] || "", tags: values[6] || "" });
            imported++;
          }
        }
        toast.success(`Zaimportowano ${imported} klientów`);
      } catch {
        toast.error("Błąd importu pliku CSV");
      }
    };
    reader.readAsText(file);
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <span className="ml-1 text-muted-foreground/30"><ChevronUp className="h-3 w-3 inline" /></span>;
    return <span className="ml-1 text-blue-500">{sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}</span>;
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
                Klienci
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Baza Twoich klientów ({clients.length})</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline" className="btn-secondary w-full sm:w-auto">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Import/Eksport</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <Download className="h-3.5 w-3.5 mr-2" /> Eksportuj do CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <label className="flex items-center w-full cursor-pointer">
                      <Upload className="h-3.5 w-3.5 mr-2" /> Importuj z CSV
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFromCSV(f); }} />
                    </label>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                  <Plus className="h-4 w-4" />
                  Dodaj klienta
                </Button>
              </motion.div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Szukaj klientów..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                {/* Filtr po tagu */}
                {allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={(v) => setTagFilter(v === "all" ? "" : (v ?? ""))}>
                    <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Tag" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie tagi</SelectItem>
                      {allTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {/* Filtr po segmencie */}
                <Select value={segmentFilter} onValueChange={(v) => setSegmentFilter((v ?? "all") as typeof segmentFilter)}>
                  <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="staly">Stały</SelectItem>
                    <SelectItem value="nowy">Nowy</SelectItem>
                    <SelectItem value="nieaktywny">Nieaktywny</SelectItem>
                  </SelectContent>
                </Select>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "grid")} className="shrink-0">
                  <TabsList>
                    <TabsTrigger value="table">Tabela</TabsTrigger>
                    <TabsTrigger value="grid">Karty</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {/* Bulk actions bar */}
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <span className="text-sm font-medium text-primary">Zaznaczono: {selectedIds.size}</span>
                  <Separator orientation="vertical" className="h-5" />
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <Tag className="h-3 w-3 mr-1" />Dodaj tag
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {["VIP", "Stały", "Priorytet", "Do kontaktu"].map((tag) => (
                        <DropdownMenuItem key={tag} onClick={() => bulkAddTag(tag)}>{tag}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={bulkExportCSV}>
                    <Download className="h-3 w-3 mr-1" />Eksportuj
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger>
                      <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3 mr-1" />Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usuń zaznaczonych klientów</AlertDialogTitle>
                        <AlertDialogDescription>Czy na pewno chcesz usunąć {selectedIds.size} klientów? Tej operacji nie można cofnąć.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-white hover:bg-destructive/90">Usuń</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
                    Odznacz
                  </Button>
                </motion.div>
              )}
              {loading ? (
                <TableSkeleton rows={5} />
              ) : filtered.length === 0 ? (
                <AnimatedEmptyState
                  icon={Users}
                  title={clients.length === 0 ? "Brak klientów" : "Brak wyników"}
                  description={clients.length === 0 ? "Dodaj pierwszego klienta" : "Spróbuj zmienić kryteria wyszukiwania"}
                  action={clients.length === 0 ? (
                    <Button className="btn-primary" onClick={openAdd}>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj klienta
                    </Button>
                  ) : undefined}
                />
              ) : viewMode === "table" ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="table-header-industrial">
                      <TableRow>
                        <TableHead className="w-10">
                          <input type="checkbox" className="rounded border-border" checked={selectedIds.size === paginatedClients.length && paginatedClients.length > 0} onChange={toggleSelectAll} />
                        </TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>Klient<SortIcon column="name" /></TableHead>
                        <TableHead>Segment</TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("phone")}>Telefon<SortIcon column="phone" /></TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("email")}>Email<SortIcon column="email" /></TableHead>
                        <TableHead>NIP</TableHead>
                        <TableHead className="text-right">Wyceny</TableHead>
                        <TableHead className="text-right">Przychód</TableHead>
                        <TableHead className="w-20">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {paginatedClients.map((c, index) => {
                          const stats = clientStats[c.id!] || { quoteCount: 0, totalRevenue: 0, lastQuoteDate: null };
                          const tags = c.tags ? c.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
                          const segment = clientSegments[c.id!];
                          const dupes = duplicateWarnings[c.id!];
                          return (
                            <motion.tr
                              key={c.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: Math.min(index * 0.03, 0.3) }}
                              className="group border-b border-border/50 hover:bg-accent/50 transition-colors"
                            >
                              <TableCell>
                                <input type="checkbox" className="rounded border-border" checked={selectedIds.has(c.id!)} onChange={() => toggleSelect(c.id!)} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(c.name)} text-white text-xs font-bold shrink-0`}>
                                    {getInitials(c.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <Link href={`/klienci/${c.id}`} className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                                        {c.name}
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </Link>
                                      {dupes && (
                                        <span className="text-amber-500" title={`Duplikat: ${dupes.join("; ")}`}>
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                        </span>
                                      )}
                                    </div>
                                    {tags.length > 0 && (
                                      <div className="flex gap-1 mt-0.5">
                                        {tags.map((tag: string, i: number) => (
                                          <Badge key={i} className={`text-[10px] px-1.5 py-0 ${getTagColor(i)}`}>{tag}</Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <SegmentBadge segment={segment} />
                              </TableCell>
                              <TableCell>
                                <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                                  {c.phone}
                                </a>
                              </TableCell>
                              <TableCell>
                                {c.email ? (
                                  <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    {c.email}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{c.nip || "-"}</TableCell>
                              <TableCell className="text-right">
                                <Link href={`/wyceny`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                  <FileText className="h-3.5 w-3.5" />
                                  {stats.quoteCount}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : "-"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c.id!)}>
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
                                        <AlertDialogTitle>Usuń klienta</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Czy na pewno chcesz usunąć &ldquo;{c.name}&rdquo;?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(c.id!)}>Usuń</AlertDialogAction>
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {paginatedClients.map((c, index) => {
                      const stats = clientStats[c.id!] || { quoteCount: 0, totalRevenue: 0, lastQuoteDate: null };
                      const tags = c.tags ? c.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
                      const segment = clientSegments[c.id!];
                      const dupes = duplicateWarnings[c.id!];
                      return (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        >
                          <Link href={`/klienci/${c.id}`}>
                            <Card className="card-modern hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer h-full">
                              <CardContent className="pt-4 sm:pt-6 p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(c.name)} text-white text-sm font-bold shrink-0`}>
                                    {getInitials(c.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <div className="font-semibold truncate">{c.name}</div>
                                      {dupes && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                    </div>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      <SegmentBadge segment={segment} />
                                      {tags.map((tag: string, i: number) => (
                                        <Badge key={i} className={`text-[10px] px-1.5 py-0 ${getTagColor(i)}`}>{tag}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2 mt-4 text-sm">
                                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                                    <Phone className="h-4 w-4 text-blue-500" />
                                    {c.phone}
                                  </a>
                                  {c.email && (
                                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                                      <Mail className="h-4 w-4" />
                                      {c.email}
                                    </a>
                                  )}
                                  {c.address && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="h-4 w-4 shrink-0" />
                                      <span className="truncate">{c.address}</span>
                                    </div>
                                  )}
                                  {c.nip && <div className="font-mono text-xs">NIP: {c.nip}</div>}
                                </div>
                                <Separator className="my-3" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{stats.quoteCount} wycen</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : "Brak przychodu"}</span>
                                </div>
                                <div className="flex gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => openEdit(c.id!)}>
                                    <Pencil className="h-3 w-3 mr-1" /> Edytuj
                                  </Button>
                                  <Link href={`/wyceny/nowa`} onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" className="flex-1 h-8 text-xs btn-primary">
                                      <Plus className="h-3 w-3 mr-1" /> Wycena
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Pokazano {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} z {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Poprzednia
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Następna
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj klienta" : "Nowy klient"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nazwa / Imię i nazwisko</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Adres</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nip">NIP</Label>
              <Input id="nip" value={form.nip} onChange={(e) => handleNipChange(e.target.value)} maxLength={10} />
              {errors.nip && <p className="text-destructive text-xs">{errors.nip}</p>}
              {!errors.nip && form.nip.length === 10 && validateNIP(form.nip) && (
                <p className="text-green-600 text-xs flex items-center gap-1"><Building2 className="h-3 w-3" />Poprawny NIP</p>
              )}
              {nipDuplicate && <p className="text-amber-600 text-xs flex items-center gap-1"><Copy className="h-3 w-3" />Klient z tym NIP już istnieje</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tagi (oddzielone przecinkami)</Label>
              <Input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="np. VIP, Stały, Nowy" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notatki</Label>
              <textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" placeholder="Dodatkowe informacje o kliencie..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Anuluj</Button>
            </DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj klienta"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
