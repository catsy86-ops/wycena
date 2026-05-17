"use client";

import { useState, useEffect, useRef } from "react";
import { useSettingsStore } from "@/store/settings-store";
import type { VatRate } from "@/types";
import { VAT_RATE_LABELS } from "@/types";
import { companySettingsSchema } from "@/lib/validators";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Building2, Landmark, Settings2, Palette, Minimize2, Database, Download, Upload, Shield } from "lucide-react";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { ThemePicker } from "@/components/theme-picker";
import { CompactModeToggle } from "@/components/compact-mode";
import { downloadBackup, importDatabase, type BackupData } from "@/lib/backup";

export default function UstawieniaPage() {
  const settings = useSettingsStore((s) => s.settings);
  const save = useSettingsStore((s) => s.save);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    nip: "",
    bankAccount: "",
    bankName: "",
    defaultVatRate: 8 as VatRate,
    defaultValidityDays: 30,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setForm({
        name: settings.name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        nip: settings.nip || "",
        bankAccount: settings.bankAccount || "",
        bankName: settings.bankName || "",
        defaultVatRate: settings.defaultVatRate || 8,
        defaultValidityDays: settings.defaultValidityDays || 30,
      });
    }
  }, [settings]);

  async function handleSave() {
    const result = companySettingsSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    await save(result.data);
    toast.success("Ustawienia zapisane");
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6 max-w-2xl">
        <StaggerItem>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Ustawienia</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Dane firmy i konfiguracja aplikacji</p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-500" />Dane firmy</CardTitle>
              <CardDescription>Informacje sprzedawcy wyświetlane na wycenach i w PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nazwa firmy</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Firma Usługowa Jan Kowalski" />
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Adres</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="ul. Przykładowa 1, 00-000 Miasto" />
                {errors.address && <p className="text-destructive text-xs">{errors.address}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+48 123 456 789" />
                  {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="firma@email.pl" />
                  {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="123-456-78-90" />
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-blue-500" />Dane bankowe</CardTitle>
              <CardDescription>Informacje o koncie bankowym do płatności</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bankName">Nazwa banku</Label>
                <Input id="bankName" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Bank Spółdzielczy" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bankAccount">Numer konta bankowego</Label>
                <Input id="bankAccount" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="PL 12 1234 5678 9012 3456 7890 1234" />
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-blue-500" />Domyślne ustawienia wyceny</CardTitle>
              <CardDescription>Domyślne wartości dla nowych wycen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Domyślna stawka VAT</Label>
                  <Select value={String(form.defaultVatRate)} onValueChange={(v) => setForm({ ...form, defaultVatRate: parseInt(v ?? "8") as VatRate })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(VAT_RATE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="validityDays">Ważność wyceny (dni)</Label>
                  <Input id="validityDays" type="number" min="1" value={form.defaultValidityDays} onChange={(e) => setForm({ ...form, defaultValidityDays: parseInt(e.target.value) || 30 })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <div className="flex justify-end pb-4">
            <Button className="btn-primary" size="lg" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Zapisz ustawienia
            </Button>
          </div>
        </StaggerItem>

        {/* Wygląd */}
        <StaggerItem>
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Wygląd</CardTitle>
              <CardDescription>Personalizacja interfejsu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Kolor akcentu</Label>
                  <p className="text-xs text-muted-foreground">Zmień główny kolor aplikacji</p>
                </div>
                <ThemePicker />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Gęstość interfejsu</Label>
                  <p className="text-xs text-muted-foreground">Kompaktowy widok = więcej danych na ekranie</p>
                </div>
                <CompactModeToggle />
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Backup */}
        <StaggerItem>
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Kopia zapasowa</CardTitle>
              <CardDescription>Eksport i import danych aplikacji</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="btn-secondary flex-1" onClick={async () => { await downloadBackup(); toast.success("Kopia zapasowa pobrana"); }}>
                  <Download className="h-4 w-4" />
                  Eksportuj kopię zapasową
                </Button>
                <label className="flex-1">
                  <span className="btn-secondary inline-flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm cursor-pointer hover:bg-accent transition-colors">
                    <Upload className="h-4 w-4" />
                    Importuj kopię zapasową
                  </span>
                  <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const data = JSON.parse(text) as BackupData;
                      const result = await importDatabase(data);
                      toast.success(`Zaimportowano ${result.imported} rekordów. Odśwież stronę.`);
                    } catch { toast.error("Błąd importu — nieprawidłowy format pliku"); }
                  }} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                Import nadpisuje istniejące dane. Zalecane wykonanie eksportu przed importem.
              </p>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}