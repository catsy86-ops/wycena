"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/store/template-store";
import { useQuoteStore } from "@/store/quote-store";
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
import { Separator } from "@/components/ui/separator";
import {
  Plus, Pencil, Trash2, Search, ClipboardList, FileText, Package,
  Copy, Download, Upload, Eye, Star, TrendingUp, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

function generateItemId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
function createEmptyItem(vat: VatRate = 8): QuoteItem {
  return calcQuoteItem({ id: generateItemId(), name: "", quantity: 1, unit: "szt", priceNettoPerUnit: 0, vatRate: vat, discountPercent: 0, nettotal: 0, vatAmount: 0, bruttoTotal: 0 });
}
function createEmptyCost(): QuoteAdditionalCost {
  return { id: generateItemId(), name: "", amount: 0, vatRate: 8, category: "inne" };
}

type SortKey = "name" | "category" | "usageCount" | "updatedAt";
type SortDir = "asc" | "desc";

const EMPTY_FORM = { name: "", description: "", category: "", defaultDiscountPercent: 0 };

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
  const duplicateTemplate = useTemplateStore((s) => s.duplicate);
  const incrementUsage = useTemplateStore((s) => s.incrementUsage);
  const services = useServiceStore((s) => s.services);
  const materials = useMaterialStore((s) => s.materials);
  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateItems, setTemplateItems] = useState<QuoteItem[]>([]);
  const [templateCosts, setTemplateCosts] = useState<QuoteAdditionalCost[]>([]);
  const [pricingModel, setPricingModel] = useState<PricingModelConfig>(DEFAULT_PRICING_MODEL);
  const [activeTab, setActiveTab] = useState("basic");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ─── Statystyki szablonów ───────────────────────────────────────────────
  const templateStats = useMemo(() => {
    const stats: Record<number, { quoteCount: number; revenue: number }> = {};
    quotes.forEach((q) => {
      if (q.templateId) {
        if (!stats[q.templateId]) stats[q.templateId] = { quoteCount: 0, revenue: 0 };
        stats[q.templateId].quoteCount += 1;
        if (q.status === "zaakceptowana") stats[q.templateId].revenue += q.totalBrutto;
      }
    });
    return stats;
  }, [quotes]);

  const categories = useMemo(() => [...new Set(templates.map((t) => t.category))].filter(Boolean), [templates]);

  // ─── Filtrowanie i sortowanie ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = templates.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "usageCount": cmp = a.usageCount - b.usageCount; break;
        case "updatedAt": cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [templates, search, categoryFilter, sortKey, sortDir]);

  // ─── CRUD ──────────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null); setForm(EMPTY_FORM); setErrors({});
    setTemplateItems([]); setTemplateCosts([]); setPricingModel(DEFAULT_PRICING_MODEL);
    setActiveTab("basic"); setDialogOpen(true);
  }

  function openEdit(id: number) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setForm({ name: t.name, description: t.description || "", category: t.category, defaultDiscountPercent: t.defaultDiscountPercent });
    setTemplateItems(t.items || []);
    setTemplateCosts(t.additionalCosts || []);
    setPricingModel(t.pricingModel || DEFAULT_PRICING_MODEL);
    setErrors({}); setActiveTab("basic"); setDialogOpen(true);
  }

  function handleSave() {
    const result = quoteTemplateSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as string] = issue.message; });
      setErrors(fieldErrors); return;
    }
    const data = { ...result.data, items: templateItems, additionalCosts: templateCosts, pricingModel };
    if (editingId) { update(editingId, data); toast.success("Szablon zaktualizowany"); }
    else { add(data); toast.success("Szablon dodany"); }
    setDialogOpen(false);
  }

  function handleDuplicate(id: number) { duplicateTemplate(id); toast.success("Szablon zduplikowany"); }

  function handleUseTemplate(id: number) {
    incrementUsage(id);
    router.push(`/wyceny/nowa?templateId=${id}`);
  }

  // ─── Eksport/Import ────────────────────────────────────────────────────
  function handleExportAll() {
    const data = JSON.stringify(templates, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `szablony-wycenka-${format(new Date(), "yyyy-MM-dd")}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Wyeksportowano ${templates.length} szablonów`);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const items = Array.isArray(data) ? data : [data];
        let imported = 0;
        for (const item of items) {
          if (item.name && item.category) {
            await add({ name: item.name, description: item.description || "", category: item.category, defaultDiscountPercent: item.defaultDiscountPercent || 0, items: item.items || [], additionalCosts: item.additionalCosts || [], pricingModel: item.pricingModel });
            imported++;
          }
        }
        toast.success(`Zaimportowano ${imported} szablonów`);
      } catch { toast.error("Błąd importu — nieprawidłowy format JSON"); }
    };
    reader.readAsText(file);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────
  function updateItem(id: string, updates: Partial<QuoteItem>) {
    setTemplateItems((prev) => prev.map((item) => item.id === id ? calcQuoteItem({ ...item, ...updates }) : item));
  }
  function addServiceToTemplate(serviceId: number) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setTemplateItems((prev) => [...prev, calcQuoteItem({ id: generateItemId(), serviceId: service.id, name: service.name, quantity: 1, unit: service.unit, priceNettoPerUnit: service.priceNetto, vatRate: service.vatRate, discountPercent: 0, nettotal: 0, vatAmount: 0, bruttoTotal: 0 })]);
  }

  const templateTotalNetto = templateItems.reduce((s, i) => s + i.nettotal, 0);
  const templateTotalBrutto = templateItems.reduce((s, i) => s + i.bruttoTotal, 0);
  const previewTemplate = previewId ? templates.find((t) => t.id === previewId) : null;
