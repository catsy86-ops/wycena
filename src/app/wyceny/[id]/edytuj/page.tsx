"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuoteStore } from "@/store/quote-store";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useSettingsStore } from "@/store/settings-store";
import type { QuoteItem, VatRate, Unit, QuoteAdditionalCost } from "@/types";
import { VAT_RATE_LABELS, UNIT_LABELS } from "@/types";
import {
  calcQuoteItem, calcTotalNetto, calcTotalVat, calcTotalBrutto,
  calcAdditionalCostsTotal, formatCurrency, round,
} from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Copy, Users, FileText, Save, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";

function generateItemId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default function EdytujWycenePage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const quotes = useQuoteStore((s) => s.quotes);
  const updateQuote = useQuoteStore((s) => s.update);
  const services = useServiceStore((s) => s.services);
  const clients = useClientStore((s) => s.clients);
  const settings = useSettingsStore((s) => s.settings);

  const quote = useMemo(() => quotes.find((q) => q.id === id), [quotes, id]);

  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNip, setClientNip] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<QuoteAdditionalCost[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Inicjalizacja formularza danymi wyceny
  useEffect(() => {
    if (quote && !initialized) {
      setClientName(quote.clientName || "");
      setClientAddress(quote.clientAddress || "");
      setClientPhone(quote.clientPhone || "");
      setClientEmail(quote.clientEmail || "");
      setClientNip(quote.clientNip || "");
      setSelectedClientId(quote.clientId ?? null);
      setGlobalDiscount(quote.globalDiscountPercent || 0);
      setNotes(quote.notes || "");
      setValidUntil(
        quote.validUntil
          ? format(new Date(quote.validUntil), "yyyy-MM-dd")
          : ""
      );
      setItems(quote.items.map((i) => ({ ...i, id: i.id || generateItemId() })));
      setAdditionalCosts(quote.additionalCosts || []);
      setInitialized(true);
    }
  }, [quote, initialized]);

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Wycena nie znaleziona</p>
        <Button variant="outline" onClick={() => router.push("/wyceny")}>Wróć do listy</Button>
      </div>
    );
  }

  function handleClientSelect(clientId: string | null) {
    if (!clientId || clientId === "none") {
      setSelectedClientId(null);
      return;
    }
    const cid = parseInt(clientId);
    const client = clients.find((c) => c.id === cid);
    if (client) {
      setSelectedClientId(cid);
      setClientName(client.name);
      setClientAddress(client.address || "");
      setClientPhone(client.phone);
      setClientEmail(client.email || "");
      setClientNip(client.nip || "");
    }
  }

  function updateItem(itemId: string, updates: Partial<QuoteItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return calcQuoteItem({ ...item, ...updates });
      })
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      calcQuoteItem({
        id: generateItemId(),
        name: "",
        quantity: 1,
        unit: "szt",
        priceNettoPerUnit: 0,
        vatRate: (settings?.defaultVatRate ?? 8) as VatRate,
        discountPercent: 0,
        nettotal: 0,
        vatAmount: 0,
        bruttoTotal: 0,
      }),
    ]);
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  function copyItem(itemId: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === itemId);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: generateItemId(), name: `${prev[idx].name} (kopia)` };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function addServiceToItems(serviceId: number) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setItems((prev) => [
      ...prev,
      calcQuoteItem({
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
      }),
    ]);
    setServiceDialogOpen(false);
  }

  function updateCost(costId: string, updates: Partial<QuoteAdditionalCost>) {
    setAdditionalCosts((prev) => prev.map((c) => (c.id === costId ? { ...c, ...updates } : c)));
  }

  function addCost() {
    setAdditionalCosts((prev) => [
      ...prev,
      { id: generateItemId(), name: "", amount: 0, vatRate: 8, category: "inne" },
    ]);
  }

  function removeCost(costId: string) {
    setAdditionalCosts((prev) => prev.filter((c) => c.id !== costId));
  }

  async function handleSave() {
    const validItems = items.filter((i) => i.name.trim() !== "" && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Dodaj przynajmniej jedną pozycję");
      return;
    }
    setSaving(true);
    try {
      const recalcItems = validItems.map(calcQuoteItem);
      const validCosts = additionalCosts.filter((c) => c.name.trim() !== "");
      const totalNetto = calcTotalNetto(recalcItems);
      const totalVat = calcTotalVat(recalcItems);
      const totalBruttoBase = calcTotalBrutto(recalcItems);
      const costsBrutto = calcAdditionalCostsTotal(validCosts).brutto;
      const combined = totalBruttoBase + costsBrutto;
      const totalBrutto = globalDiscount > 0 ? round(combined * (1 - globalDiscount / 100)) : combined;

      await updateQuote(id, {
        clientId: selectedClientId ?? undefined,
        clientName,
        clientAddress: clientAddress || undefined,
        clientPhone: clientPhone || undefined,
        clientEmail: clientEmail || undefined,
        clientNip: clientNip || undefined,
        items: recalcItems,
        additionalCosts: validCosts,
        globalDiscountPercent: globalDiscount,
        notes: notes || undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        totalNetto,
        totalVat,
        totalBrutto,
      });
      toast.success("Wycena zaktualizowana");
      router.push(`/wyceny/${id}`);
    } catch {
      toast.error("Błąd podczas zapisywania");
    } finally {
      setSaving(false);
    }
  }

  const totalNetto = calcTotalNetto(items);
  const totalVat = calcTotalVat(items);
  const totalBruttoBase = calcTotalBrutto(items);
  const costsTotal = calcAdditionalCostsTotal(additionalCosts);
  const combined = totalBruttoBase + costsTotal.brutto;
  const discountAmount = globalDiscount > 0 ? round(combined * globalDiscount / 100) : 0;
  const finalBrutto = globalDiscount > 0 ? round(combined - discountAmount) : combined;

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <StaggerItem>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="btn-ghost" onClick={() => router.push(`/wyceny/${id}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe">Edytuj wycenę</h1>
                <p className="text-muted-foreground text-sm mt-0.5">{quote.number}</p>
              </div>
            </div>
            <Button className="btn-primary" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </StaggerItem>

        {/* Dane klienta */}
        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />Dane klienta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Wybierz z bazy</Label>
                <Select onValueChange={handleClientSelect} value={selectedClientId ? String(selectedClientId) : "none"}>
                  <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nowy / ręczny</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nazwa klienta</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>NIP</Label>
                  <Input value={clientNip} onChange={(e) => setClientNip(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Adres</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Pozycje */}
        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />Pozycje wyceny
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                  <DialogTrigger>
                    <Button variant="outline" size="sm" className="btn-secondary">
                      <Package className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Z katalogu</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl max-h-[70vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Wybierz usługę</DialogTitle></DialogHeader>
                    <div className="space-y-2 mt-3">
                      {services.map((s) => (
                        <motion.button
                          key={s.id}
                          onClick={() => addServiceToItems(s.id!)}
                          className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors text-left"
                          whileHover={{ x: 4 }}
                        >
                          <div>
                            <div className="font-semibold text-sm">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{UNIT_LABELS[s.unit]} · VAT {s.vatRate}%</div>
                          </div>
                          <div className="font-bold text-primary text-sm">{formatCurrency(s.priceNetto)}</div>
                        </motion.button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="btn-secondary" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dodaj</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-44">Nazwa</TableHead>
                      <TableHead className="w-20">Ilość</TableHead>
                      <TableHead className="w-24">Jedn.</TableHead>
                      <TableHead className="w-28">Cena netto</TableHead>
                      <TableHead className="w-20">VAT</TableHead>
                      <TableHead className="w-20">Rabat%</TableHead>
                      <TableHead className="text-right w-24">Netto</TableHead>
                      <TableHead className="text-right w-24">Brutto</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="h-8 text-sm" placeholder="Nazwa" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: (v ?? "szt") as Unit })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" step="0.01" value={item.priceNettoPerUnit} onChange={(e) => updateItem(item.id, { priceNettoPerUnit: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Select value={String(item.vatRate)} onValueChange={(v) => updateItem(item.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" max="100" value={item.discountPercent} onChange={(e) => updateItem(item.id, { discountPercent: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatCurrency(item.nettotal)}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-primary">{formatCurrency(item.bruttoTotal)}</TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyItem(item.id)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Koszty dodatkowe */}
        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Koszty dodatkowe</CardTitle>
              <Button variant="outline" size="sm" className="btn-secondary" onClick={addCost}>
                <Plus className="h-3.5 w-3.5" />Dodaj
              </Button>
            </CardHeader>
            <CardContent>
              {additionalCosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Brak kosztów dodatkowych</p>
              ) : (
                <div className="space-y-2">
                  {additionalCosts.map((cost) => (
                    <div key={cost.id} className="grid grid-cols-[1fr_120px_100px_80px_36px] gap-2 items-center">
                      <Input value={cost.name} onChange={(e) => updateCost(cost.id, { name: e.target.value })} placeholder="Nazwa kosztu" className="h-8 text-sm" />
                      <Select value={cost.category} onValueChange={(v) => updateCost(cost.id, { category: v as QuoteAdditionalCost["category"] })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dojazd">Dojazd</SelectItem>
                          <SelectItem value="materialy">Materiały</SelectItem>
                          <SelectItem value="sprzet">Sprzęt</SelectItem>
                          <SelectItem value="inne">Inne</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" min="0" step="0.01" value={cost.amount} onChange={(e) => updateCost(cost.id, { amount: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" placeholder="Kwota" />
                      <Select value={String(cost.vatRate)} onValueChange={(v) => updateCost(cost.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCost(cost.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Ustawienia i podsumowanie */}
        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-modern">
              <CardHeader className="pb-2"><CardTitle className="text-base">Ustawienia</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Ważna do</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Rabat globalny (%)</Label>
                  <Input type="number" min="0" max="100" value={globalDiscount} onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="grid gap-2">
                  <Label>Uwagi</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Dodatkowe informacje..." />
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern" style={{ background: "linear-gradient(135deg, oklch(0.52 0.19 220 / 0.06), oklch(0.62 0.17 195 / 0.04))", borderColor: "oklch(0.52 0.19 220 / 0.2)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-base">Podsumowanie</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suma netto:</span>
                  <span className="font-semibold">{formatCurrency(totalNetto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suma VAT:</span>
                  <span className="font-semibold">{formatCurrency(totalVat)}</span>
                </div>
                {costsTotal.brutto > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Koszty dodatkowe:</span>
                    <span className="font-semibold">{formatCurrency(costsTotal.brutto)}</span>
                  </div>
                )}
                {globalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Rabat ({globalDiscount}%):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-black text-pipe">
                  <span>DO ZAPŁATY:</span>
                  <span>{formatCurrency(finalBrutto)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Przyciski */}
        <StaggerItem>
          <div className="flex justify-end gap-3 pb-4">
            <Button variant="outline" className="btn-secondary" onClick={() => router.push(`/wyceny/${id}`)}>
              Anuluj
            </Button>
            <Button className="btn-primary" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
