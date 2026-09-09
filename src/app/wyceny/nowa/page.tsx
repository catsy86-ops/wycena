"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useTemplateStore } from "@/store/template-store";
import { useSettingsStore } from "@/store/settings-store";
import type { QuoteItem, VatRate, Unit, QuoteStatus, QuoteAdditionalCost, PricingModelConfig } from "@/types";
import { VAT_RATE_LABELS, UNIT_LABELS, STATUS_LABELS, DEFAULT_PRICING_MODEL } from "@/types";
import { calcQuoteItem, calcTotalNetto, calcTotalVat, calcTotalBrutto, calcAdditionalCostsTotal, calcQuoteTotals, formatCurrency, round, calcAdvancedPricing, type AdvancedPricingResult } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Package, ArrowLeft, Users, FileText, Calculator, Settings2, Info, Copy, Lightbulb, LayoutTemplate, Globe } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalPricingPanel } from "@/components/external-pricing-panel";
import { QuoteItemsDnD } from "@/components/quote/quote-items-dnd";
import { QuoteVariants } from "@/components/quote/quote-variants";
import { PhotoGallery } from "@/components/photo-gallery";
import { TravelCalculator } from "@/components/travel-calculator";
import { AIConversionPrediction } from "@/components/ai-assistant";
import { QuoteAIPanel } from "@/components/quote/quote-ai-panel";
import type { QuoteVariant, QuotePhoto } from "@/types";

function generateItemId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function createEmptyItem(defaultVatRate: VatRate = 8): QuoteItem {
  return calcQuoteItem({
    id: generateItemId(),
    name: "",
    quantity: 1,
    unit: "szt",
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

export default function NowaWycenaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const services = useServiceStore((s) => s.services);
  const clients = useClientStore((s) => s.clients);
  const settings = useSettingsStore((s) => s.settings);
  const templates = useTemplateStore((s) => s.templates);
  const addQuote = useQuoteStore((s) => s.add);

  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNip, setClientNip] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([createEmptyItem(settings?.defaultVatRate || 8)]);
  const [additionalCosts, setAdditionalCosts] = useState<QuoteAdditionalCost[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [useAdvancedPricing, setUseAdvancedPricing] = useState(false);
  const [pricingModel, setPricingModel] = useState<PricingModelConfig>(DEFAULT_PRICING_MODEL);
  const [activeTab, setActiveTab] = useState("items");
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [showExternalPricing, setShowExternalPricing] = useState(false);
  const [photos, setPhotos] = useState<QuotePhoto[]>([]);
  const [variants, setVariants] = useState<QuoteVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  const quotes = useQuoteStore((s) => s.quotes);

  const suggestedServices = useMemo(() => {
    if (!selectedClientId) return [];
    const clientQuotes = quotes.filter((q) => q.clientId === selectedClientId);
    const serviceUsage: Record<number, { serviceId: number; name: string; priceNetto: number; unit: Unit; vatRate: VatRate; count: number; avgQty: number }> = {};
    clientQuotes.forEach((q) => {
      q.items.forEach((item) => {
        if (item.serviceId) {
          if (!serviceUsage[item.serviceId]) {
            serviceUsage[item.serviceId] = { serviceId: item.serviceId, name: item.name, priceNetto: item.priceNettoPerUnit, unit: item.unit, vatRate: item.vatRate, count: 0, avgQty: 0 };
          }
          serviceUsage[item.serviceId].count += 1;
          serviceUsage[item.serviceId].avgQty += item.quantity;
        }
      });
    });
    return Object.values(serviceUsage)
      .map((s) => ({ ...s, avgQty: Math.round((s.avgQty / s.count) * 100) / 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [selectedClientId, quotes]);

  useEffect(() => {
    const templateId = searchParams?.get("templateId");
    if (templateId) {
      const template = templates.find((t) => t.id === parseInt(templateId));
      if (template) {
        setTemplateName(template.name);
        if (template.items && template.items.length > 0) {
          setItems(template.items.map((item) => ({
            ...item,
            id: generateItemId(),
          })));
        }
        if (template.additionalCosts && template.additionalCosts.length > 0) {
          setAdditionalCosts(template.additionalCosts.map((cost) => ({
            ...cost,
            id: generateItemId(),
          })));
        }
        setGlobalDiscount(template.defaultDiscountPercent);
        if (template.pricingModel) {
          setPricingModel(template.pricingModel);
          setUseAdvancedPricing(true);
        }
        toast.success(`Wczytano szablon: ${template.name}`);
      }
    }

    // Obsługa wczytywania szybkiej wyceny z kalkulatora hydrauliki
    const source = searchParams?.get("source");
    if (source === "hydraulika") {
      const saved = localStorage.getItem("gksystem_quick_plumbing_quote");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed.map((it) => calcQuoteItem({
              ...createEmptyItem(8),
              ...it,
              id: generateItemId(),
            })));
            toast.success("Wczytano pozycje z kalkulatora hydraulicznego");
            localStorage.removeItem("gksystem_quick_plumbing_quote");
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Obsługa wczytywania szybkiej wyceny z kalkulatora elektrycznego
    if (source === "elektryka") {
      const saved = localStorage.getItem("gksystem_quick_electrical_quote");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed.map((it) => calcQuoteItem({
              ...createEmptyItem(8),
              ...it,
              id: generateItemId(),
            })));
            toast.success("Wczytano pozycje z kalkulatora elektrycznego");
            localStorage.removeItem("gksystem_quick_electrical_quote");
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [searchParams, templates]);

  function handleClientSelect(clientId: string) {
    if (!clientId || clientId === "none") {
      setSelectedClientId(null);
      setClientName("");
      setClientAddress("");
      setClientPhone("");
      setClientEmail("");
      setClientNip("");
      return;
    }
    const id = parseInt(clientId);
    const client = clients.find((c) => c.id === id);
    if (client) {
      setSelectedClientId(id);
      setClientName(client.name);
      setClientAddress(client.address || "");
      setClientPhone(client.phone);
      setClientEmail(client.email || "");
      setClientNip(client.nip || "");
    }
  }

  function updateItem(id: string, updates: Partial<QuoteItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        return calcQuoteItem(updated);
      })
    );
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem(settings?.defaultVatRate || 8)]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function copyItem(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copied = {
        ...original,
        id: generateItemId(),
        name: `${original.name} (kopia)`,
      };
      const newItems = [...prev];
      newItems.splice(idx + 1, 0, copied);
      return newItems;
    });
    toast.success("Pozycja zduplikowana");
  }

  function addServiceToItems(serviceId: number) {
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
    setItems((prev) => [...prev, newItem]);
    setServiceDialogOpen(false);
  }

  function loadTemplate(templateId: number) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setTemplateName(template.name);
    if (template.items && template.items.length > 0) {
      setItems(template.items.map((item) => ({ ...item, id: generateItemId() })));
    }
    if (template.additionalCosts && template.additionalCosts.length > 0) {
      setAdditionalCosts(template.additionalCosts.map((cost) => ({ ...cost, id: generateItemId() })));
    }
    setGlobalDiscount(template.defaultDiscountPercent);
    if (template.pricingModel) {
      setPricingModel(template.pricingModel);
      setUseAdvancedPricing(true);
    }
    toast.success(`Wczytano szablon: ${template.name}`);
  }

  function updateAdditionalCost(id: string, updates: Partial<QuoteAdditionalCost>) {
    setAdditionalCosts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function addAdditionalCost() {
    setAdditionalCosts((prev) => [...prev, createEmptyCost()]);
  }

  function removeAdditionalCost(id: string) {
    setAdditionalCosts((prev) => prev.filter((c) => c.id !== id));
  }

  function copyAdditionalCost(id: string) {
    setAdditionalCosts((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copied = {
        ...original,
        id: generateItemId(),
        name: `${original.name} (kopia)`,
      };
      const newCosts = [...prev];
      newCosts.splice(idx + 1, 0, copied);
      return newCosts;
    });
    toast.success("Koszt zduplikowany");
  }

  function updatePricingModelField(field: keyof PricingModelConfig, value: number) {
    setPricingModel((prev) => ({ ...prev, [field]: value }));
  }

  function handleExternalItems(newItems: QuoteItem[]) {
    setItems((prev) => {
      // Filtruj puste pozycje przed dodaniem
      const nonEmpty = prev.filter((i) => i.name.trim() !== "" || i.priceNettoPerUnit > 0);
      return [...nonEmpty, ...newItems];
    });
    setActiveTab("items");
    toast.success(`Dodano ${newItems.length} pozycji z zewnętrznego cennika`);
  }

  function handleApplyPriceToItem(itemId: string, price: number, source: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return calcQuoteItem({ ...item, priceNettoPerUnit: price, externalPrice: price, externalPriceSource: source });
      })
    );
    toast.success("Cena z API zastosowana");
  }

  function handleSave(status: QuoteStatus = "szkic") {
    const validItems = items.filter((i) => i.name.trim() !== "" && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Dodaj przynajmniej jedną pozycję do wyceny");
      return;
    }
    if (!clientName.trim()) {
      toast.error("Podaj nazwę klienta lub wybierz klienta z listy");
      return;
    }
    const recalcItems = validItems.map(calcQuoteItem);
    const validCosts = additionalCosts.filter((c) => c.name.trim() !== "");

    let totalNetto: number;
    let totalVat: number;
    let totalBrutto: number;

    if (useAdvancedPricing) {
      const advanced = calcAdvancedPricing(recalcItems, validCosts, globalDiscount, pricingModel);
      totalNetto = advanced.finalNetto;
      totalVat = advanced.finalVat;
      totalBrutto = advanced.finalBrutto;
    } else {
      // Używamy calcQuoteTotals — uwzględnia koszty dodatkowe i rabat globalny poprawnie
      const totals = calcQuoteTotals(recalcItems, validCosts, globalDiscount);
      totalNetto = totals.totalNetto;
      totalVat = totals.totalVat;
      totalBrutto = totals.totalBrutto;
    }

    addQuote({
      clientId: selectedClientId || undefined,
      clientName,
      clientAddress: clientAddress || undefined,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      clientNip: clientNip || undefined,
      items: recalcItems,
      additionalCosts: validCosts,
      progressiveDiscounts: pricingModel.volumeDiscounts,
      globalDiscountPercent: globalDiscount,
      notes: notes || undefined,
      status,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      totalNetto,
      totalVat,
      totalBrutto,
      templateId: templateName ? templates.find((t) => t.name === templateName)?.id : undefined,
    }).then((id) => {
      toast.success(status === "szkic" ? "Wycena zapisana jako szkic" : "Wycena utworzona");
      router.push(`/wyceny/${id}`);
    });
  }

  // Live preview totals — używamy calcQuoteTotals dla spójności z handleSave
  const liveStandardTotals = calcQuoteTotals(items, additionalCosts, globalDiscount);
  const totalNetto = liveStandardTotals.totalNetto;
  const totalVat = liveStandardTotals.totalVat;
  const totalBruttoBeforeDiscount = calcTotalBrutto(items);
  const costsTotal = calcAdditionalCostsTotal(additionalCosts);
  const combinedBrutto = round(totalBruttoBeforeDiscount + costsTotal.brutto);
  const globalDiscountAmount = liveStandardTotals.discountAmount;
  const finalBrutto = liveStandardTotals.totalBrutto;

  const advancedPricing = useAdvancedPricing ? calcAdvancedPricing(items, additionalCosts, globalDiscount, pricingModel) : null;

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6 max-w-5xl mx-auto">
        <StaggerItem>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="btn-ghost" onClick={() => router.push("/wyceny")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Nowa wycena</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Utwórz nową wycenę usług</p>
              {templateName && (
                <Badge className="mt-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Szablon: {templateName}</Badge>
              )}
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Dane klienta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Wybierz z bazy (opcjonalnie)</Label>
                <Select onValueChange={(v) => handleClientSelect(v ?? "none")} value={selectedClientId ? String(selectedClientId) : "none"}>
                  <SelectTrigger><SelectValue placeholder="Wybierz klienta z bazy..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nowy klient</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} - {c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nazwa klienta</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Imię i nazwisko / Firma" />
                </div>
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Numer telefonu" />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" />
                </div>
                <div className="grid gap-2">
                  <Label>NIP</Label>
                  <Input value={clientNip} onChange={(e) => setClientNip(e.target.value)} placeholder="NIP (opcjonalnie)" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Adres</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Adres klienta" />
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {templates.length > 0 && !templateName && (
          <StaggerItem>
            <Card className="card-modern">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-violet-500" />
                  Szybki wybór szablonu
                </CardTitle>
                <CardDescription>Wybierz szablon aby szybko wypełnić wycenę</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((t) => (
                    <motion.button
                      key={t.id}
                      onClick={() => loadTemplate(t.id!)}
                      className="rounded-xl border border-border/50 p-4 text-left hover:bg-accent/50 hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="font-semibold text-sm group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{t.name}</div>
                      {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{t.items.length} pozycji</span>
                        <span>&middot;</span>
                        <span>Użyto {t.usageCount}x</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {showExternalPricing && (
          <StaggerItem>
            <ExternalPricingPanel
              onApplyItems={handleExternalItems}
              onApplyPriceToItem={handleApplyPriceToItem}
              existingItems={items}
            />
          </StaggerItem>
        )}

        <StaggerItem>
          <Card className="card-modern">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Pozycje wyceny
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-secondary h-8 text-xs"
                    onClick={() => setShowExternalPricing((v) => !v)}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Cenniki zewnętrzne</span>
                  </Button>
                  <TabsList>
                    <TabsTrigger value="items">Pozycje</TabsTrigger>
                    <TabsTrigger value="costs">Koszty ({additionalCosts.length})</TabsTrigger>
                    <TabsTrigger value="pricing">Model wyceny</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              <TabsContent value="items">
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                      <DialogTrigger>
                        <Button variant="outline" size="sm" className="btn-secondary">
                          <Package className="mr-2 h-4 w-4" />
                          Z katalogu
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Wybierz usługi z katalogu</DialogTitle>
                        </DialogHeader>

                        {suggestedServices.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb className="h-4 w-4 text-amber-500" />
                              <h3 className="font-semibold text-sm">Sugerowane usługi (historia klienta)</h3>
                            </div>
                            <div className="space-y-2">
                              {suggestedServices.map((s) => {
                                const alreadyAdded = items.some((i) => i.serviceId === s.serviceId);
                                return (
                                  <motion.button
                                    key={s.serviceId}
                                    onClick={() => !alreadyAdded && addServiceToItems(s.serviceId)}
                                    disabled={alreadyAdded}
                                    className={`flex w-full items-center justify-between rounded-xl border p-3 transition-colors text-left ${alreadyAdded ? "opacity-50 cursor-not-allowed bg-muted/50" : "hover:bg-accent/50"}`}
                                    whileHover={!alreadyAdded ? { x: 4 } : {}}
                                  >
                                    <div>
                                      <div className="font-semibold text-sm">{s.name}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {UNIT_LABELS[s.unit]} &middot; VAT {s.vatRate}% &middot; Użyto {s.count}x &middot; Śr. ilość: {s.avgQty}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(s.priceNetto)}</div>
                                      {alreadyAdded && <div className="text-xs text-muted-foreground">Dodane</div>}
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                            <Separator className="my-4" />
                          </div>
                        )}

                        <div className="space-y-2 mt-4">
                          {services.map((s) => (
                            <motion.button
                              key={s.id}
                              onClick={() => addServiceToItems(s.id!)}
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
                    <Button variant="outline" size="sm" className="btn-secondary" onClick={addItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj pozycję
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">Brak pozycji. Dodaj pozycję z katalogu lub ręcznie.</div>
                  ) : (
                    <QuoteItemsDnD
                      items={items}
                      onItemsChange={setItems}
                      onCopyItem={copyItem}
                      onRemoveItem={removeItem}
                    />
                  )}
                </CardContent>
              </TabsContent>

              <TabsContent value="costs">
                <CardContent>
                  <Button variant="outline" size="sm" className="btn-secondary mb-4" onClick={addAdditionalCost}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj koszt dodatkowy
                  </Button>

                  {additionalCosts.length === 0 ? (
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
                            <TableHead className="w-20" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {additionalCosts.map((cost) => (
                            <TableRow key={cost.id}>
                              <TableCell>
                                <Input value={cost.name} onChange={(e) => updateAdditionalCost(cost.id, { name: e.target.value })} placeholder="Nazwa kosztu" className="h-9" />
                              </TableCell>
                              <TableCell>
                                <Select value={cost.category} onValueChange={(v) => updateAdditionalCost(cost.id, { category: v as QuoteAdditionalCost["category"] })}>
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
                                <Input type="number" min="0" step="0.01" value={cost.amount} onChange={(e) => updateAdditionalCost(cost.id, { amount: parseFloat(e.target.value) || 0 })} className="h-9" />
                              </TableCell>
                              <TableCell>
                                <Select value={String(cost.vatRate)} onValueChange={(v) => updateAdditionalCost(cost.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(VAT_RATE_LABELS).map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => copyAdditionalCost(cost.id)}>
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeAdditionalCost(cost.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {additionalCosts.length > 0 && (
                    <div className="flex justify-end gap-4 text-sm font-semibold pt-4 border-t mt-4">
                      <span>Koszty dodatkowe netto: {formatCurrency(costsTotal.netto)}</span>
                      <span className="text-blue-600 dark:text-blue-400">Koszty dodatkowe brutto: {formatCurrency(costsTotal.brutto)}</span>
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              <TabsContent value="pricing">
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold">Zaawansowany model wyceny</h3>
                    </div>
                    <Button
                      variant={useAdvancedPricing ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseAdvancedPricing(!useAdvancedPricing)}
                    >
                      {useAdvancedPricing ? "Włączony" : "Wyłączony"}
                    </Button>
                  </div>

                  {useAdvancedPricing && (
                    <>
                      <CardDescription>Model uniwersytecki uwzględniający złożoność, ryzyko, koszty pośrednie, inflację i inne czynniki.</CardDescription>

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

                      {/* Nowe pola — sezonowość, narzut na materiały, minimum */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                        <div className="grid gap-2">
                          <Label className="text-xs flex items-center gap-1">
                            Korekta sezonowa (%)
                            <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Np. +15% w sezonie grzewczym, -10% poza sezonem</p></TooltipContent></Tooltip></TooltipProvider>
                          </Label>
                          <Input type="number" min="-20" max="50" value={pricingModel.seasonalAdjustmentPercent} onChange={(e) => updatePricingModelField("seasonalAdjustmentPercent", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs flex items-center gap-1">
                            Narzut na materiały (%)
                            <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Marża handlowa na materiałach (cena zakupu → sprzedaży)</p></TooltipContent></Tooltip></TooltipProvider>
                          </Label>
                          <Input type="number" min="0" max="100" value={pricingModel.materialMarkupPercent} onChange={(e) => updatePricingModelField("materialMarkupPercent", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs flex items-center gap-1">
                            Minimum kwotowe (PLN)
                            <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Minimalna wartość wyceny netto — wycena nie może być niższa</p></TooltipContent></Tooltip></TooltipProvider>
                          </Label>
                          <Input type="number" min="0" step="50" value={pricingModel.minimumQuoteAmount} onChange={(e) => updatePricingModelField("minimumQuoteAmount", parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>

                      {advancedPricing && (
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 mt-4">
                          <CardHeader className="pb-2"><CardTitle className="text-sm">Szczegółowa kalkulacja</CardTitle></CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              {Object.entries(advancedPricing.breakdown).filter(([, v]) => v !== 0).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground">{key}:</span>
                                  <span className={value < 0 ? "text-green-600" : "font-semibold"}>{value < 0 ? "-" : ""}{formatCurrency(Math.abs(value))}</span>
                                </div>
                              ))}
                              <Separator />
                              <div className="flex justify-between text-lg font-bold">
                                <span>Netto:</span>
                                <span>{formatCurrency(advancedPricing.finalNetto)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>VAT (23%):</span>
                                <span>{formatCurrency(advancedPricing.finalVat)}</span>
                              </div>
                              <div className="flex justify-between text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                <span>Brutto:</span>
                                <span>{formatCurrency(advancedPricing.finalBrutto)}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between text-sm">
                                <span>Marża:</span>
                                <span className="font-semibold">{advancedPricing.marginPercent}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-modern">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Opcje dodatkowe</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Rabat globalny (%)</Label>
                  <Input type="number" min="0" max="100" value={globalDiscount} onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="grid gap-2">
                  <Label>Ważna do</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Uwagi</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dodatkowe informacje do wyceny..." rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card className="card-gauge">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Podsumowanie</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {useAdvancedPricing && advancedPricing ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pozycje bazowe (netto):</span>
                      <span className="font-semibold">{formatCurrency(advancedPricing.baseNetto)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Koszty dodatkowe (netto):</span>
                      <span className="font-semibold">{formatCurrency(costsTotal.netto)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dostosowania:</span>
                      <span className="font-semibold">{formatCurrency(
                        advancedPricing.laborAdjustment +
                        advancedPricing.materialWasteCost +
                        advancedPricing.equipmentCost +
                        advancedPricing.travelCost +
                        advancedPricing.permitCost +
                        advancedPricing.overheadCost +
                        advancedPricing.riskMarginAmount +
                        advancedPricing.complexityAdjustment +
                        advancedPricing.urgencyAdjustment +
                        advancedPricing.inflationAdjustment +
                        advancedPricing.insuranceCost +
                        advancedPricing.warrantyReserve +
                        advancedPricing.profitMarginAmount
                      )}</span>
                    </div>
                    {advancedPricing.volumeDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Rabat ilościowy:</span>
                        <span>-{formatCurrency(advancedPricing.volumeDiscountAmount)}</span>
                      </div>
                    )}
                    {globalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Rabat globalny ({globalDiscount}%):</span>
                        <span>-{formatCurrency(globalDiscountAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      <span>Do zapłaty:</span>
                      <span>{formatCurrency(advancedPricing.finalBrutto)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Marża:</span>
                      <span>{advancedPricing.marginPercent}%</span>
                    </div>
                    {advancedPricing.minimumApplied && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2 py-1.5 mt-1">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        Zastosowano minimum kwotowe
                      </div>
                    )}
                    <Separator />
                    <div className={`flex items-start gap-2 rounded-md px-2 py-2 text-xs ${
                      advancedPricing.profitability.rating === "excellent" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
                      advancedPricing.profitability.rating === "good" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400" :
                      advancedPricing.profitability.rating === "acceptable" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" :
                      "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                    }`}>
                      <Calculator className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{advancedPricing.profitability.suggestion}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Suma netto:</span>
                      <span className="font-semibold">{formatCurrency(totalNetto)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Suma VAT:</span>
                      <span className="font-semibold">{formatCurrency(totalVat)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Suma brutto:</span>
                      <span className="font-semibold">{formatCurrency(totalBruttoBeforeDiscount)}</span>
                    </div>
                    {costsTotal.brutto > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Koszty dodatkowe brutto:</span>
                        <span className="font-semibold">{formatCurrency(costsTotal.brutto)}</span>
                      </div>
                    )}
                    {globalDiscount > 0 && (
                      <>
                        <Separator />
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Rabat globalny ({globalDiscount}%):</span>
                          <span>-{formatCurrency(globalDiscountAmount)}</span>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div className="flex justify-between text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      <span>Do zapłaty:</span>
                      <span>{formatCurrency(finalBrutto)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* ── Warianty + Galeria + Kalkulator + AI ── */}
        <StaggerItem>
          <QuoteVariants
            variants={variants}
            selectedVariantId={selectedVariantId}
            onVariantsChange={setVariants}
            onSelectVariant={setSelectedVariantId}
            currentItems={items}
            currentCosts={additionalCosts}
            currentDiscount={globalDiscount}
            currentTotals={{ netto: totalNetto, vat: totalVat, brutto: finalBrutto }}
          />
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PhotoGallery photos={photos} onPhotosChange={setPhotos} />
            <TravelCalculator
              fromAddress={settings?.address}
              ratePerKm={pricingModel.travelCostPerKm || 2.5}
              onCalculated={(km, cost) => {
                setPricingModel((prev) => ({ ...prev, estimatedDistanceKm: km, travelCostPerKm: cost / (km * 2) }));
              }}
            />
          </div>
        </StaggerItem>

        {/* AI Predykcja konwersji */}
        {finalBrutto > 0 && (
          <StaggerItem>
            <QuoteAIPanel clientId={selectedClientId} quoteValue={finalBrutto} />
          </StaggerItem>
        )}

        <StaggerItem>
          <div className="flex justify-end gap-3 pb-4">
            <Button variant="outline" className="btn-secondary" onClick={() => router.push("/wyceny")}>Anuluj</Button>
            <Button variant="outline" className="btn-secondary" onClick={() => handleSave("szkic")}>Zapisz jako szkic</Button>
            <Button className="btn-primary" onClick={() => handleSave("wyslana")}>Zapisz i wyślij</Button>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
