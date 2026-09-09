"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { PlumbingPressureProtocol, PLUMBING_STANDARDS, PLUMBING_PROTOCOL_PRESETS, formatPlumbingDate } from "@/lib/plumbing-protocols";
import { downloadPlumbingProtocolPDF } from "@/lib/plumbing-pdf";
import { useSettingsStore } from "@/store/settings-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle2, AlertCircle, Droplets, Plus, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";

interface PlumbingProtocolManagerProps {
  initialProtocols?: PlumbingPressureProtocol[];
}

const DEFAULT_MOCK_PROTOCOLS: PlumbingPressureProtocol[] = [
  {
    id: "proto-hyd-1",
    number: "PROT-HYD/2026/01",
    date: new Date(),
    location: "Kraków, ul. Wiślana 12/4",
    clientName: "Tomasz Adamski",
    clientAddress: "ul. Wiślana 12/4, 30-001 Kraków",
    clientPhone: "501 234 567",
    plumberName: "Jan Hydraulik",
    plumberLicense: "Instalator OZE / SEP G3",
    installationType: "ogrzewanie_podlogowe",
    pipeMaterial: "PEX",
    testMedium: "woda",
    workingPressureBar: 2.5,
    testPressureBar: 6.0,
    durationMinutes: 120,
    initialPressureBar: 6.0,
    finalPressureBar: 6.0,
    pressureDropBar: 0.0,
    testResult: "pozytywny",
    manometerSerial: "WIKA-98421",
    ambientTemperatureC: 18,
    notes: "Wszystkie 7 pętli ogrzewania podłogowego szczelne. Zezwolono na zalanie jastrychem.",
    status: "completed",
  },
];

export function PlumbingProtocolManager({ initialProtocols = DEFAULT_MOCK_PROTOCOLS }: PlumbingProtocolManagerProps) {
  const [protocols, setProtocols] = useState<PlumbingPressureProtocol[]>(initialProtocols);
  const [dialogOpen, setDialogOpen] = useState(false);
  const settings = useSettingsStore((s) => s.settings);

  // Wczytywanie z IndexedDB
  useEffect(() => {
    db.plumbingProtocols.toArray().then((stored) => {
      if (stored && stored.length > 0) {
        setProtocols(stored);
      } else {
        db.plumbingProtocols.bulkPut(DEFAULT_MOCK_PROTOCOLS).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // Nowy formularz protokołu
  const [form, setForm] = useState<Omit<PlumbingPressureProtocol, "id" | "number" | "date">>({
    location: "",
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    plumberName: settings?.name || "Instalator",
    plumberLicense: "",
    installationType: "woda_zimna_ciepla",
    pipeMaterial: "PEX",
    testMedium: "woda",
    workingPressureBar: 4.0,
    testPressureBar: 10.0,
    durationMinutes: 120,
    initialPressureBar: 10.0,
    finalPressureBar: 10.0,
    pressureDropBar: 0.0,
    testResult: "pozytywny",
    manometerSerial: "",
    ambientTemperatureC: 20,
    notes: "Instalacja poddana próbie ciśnieniowej. Brak widocznych wycieków.",
    status: "completed",
  });

  const handleApplyPreset = (presetName: string) => {
    const preset = PLUMBING_PROTOCOL_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      installationType: preset.type,
      testMedium: preset.medium,
      workingPressureBar: preset.defaultWorkingPressure,
      testPressureBar: preset.defaultTestPressure,
      initialPressureBar: preset.defaultTestPressure,
      finalPressureBar: preset.defaultTestPressure,
      pressureDropBar: 0.0,
      durationMinutes: preset.durationMinutes,
    }));
    toast.info(`Zastosowano parametry normowe (${preset.norm})`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.location) {
      toast.error("Wypełnij dane klienta i lokalizację próby.");
      return;
    }

    const newProtocol: PlumbingPressureProtocol = {
      ...form,
      id: `proto-hyd-${Date.now()}`,
      number: `PROT-HYD/${new Date().getFullYear()}/${String(protocols.length + 1).padStart(2, "0")}`,
      date: new Date(),
    };

    try {
      await db.plumbingProtocols.put(newProtocol);
      setProtocols([newProtocol, ...protocols]);
      setDialogOpen(false);
      toast.success("Utworzono i zapisano protokół próby ciśnieniowej!");
    } catch {
      setProtocols([newProtocol, ...protocols]);
      setDialogOpen(false);
      toast.success("Utworzono protokół próby ciśnieniowej!");
    }
  };

  const handleDownloadPDF = (proto: PlumbingPressureProtocol) => {
    downloadPlumbingProtocolPDF(proto, {
      companyName: settings?.name || "Instalacje Hydrauliczne",
      companyAddress: settings?.address || "",
      companyPhone: settings?.phone || "",
      companyEmail: settings?.email || "",
      companyTaxId: settings?.nip || "",
    });
    toast.success("Pobrano protokół w formacie PDF");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-600" />
            Protokoły Prób Ciśnieniowych i Szczelności
          </h2>
          <p className="text-xs text-muted-foreground">
            Oficjalna dokumentacja odbiorcza instalacji wod-kan, CO i ogrzewania podłogowego (PN-EN 806-4, PN-EN 14336)
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              Nowy protokół próby
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-cyan-600" />
                Wystaw protokół próby szczelności
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 py-2">
              {/* Szybkie szablony */}
              <div className="bg-cyan-50 dark:bg-cyan-950/30 p-3 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <label className="text-xs font-semibold text-cyan-900 dark:text-cyan-300 block mb-1.5">
                  Wybierz typowy wzorzec próby:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PLUMBING_PROTOCOL_PRESETS.map((p) => (
                    <Button
                      key={p.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 bg-white dark:bg-slate-900 border-cyan-300"
                      onClick={() => handleApplyPreset(p.name)}
                    >
                      {p.name.split("(")[0]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Dane klienta i obiektu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Klient / Inwestor *</Label>
                  <Input
                    required
                    placeholder="np. Jan Kowalski"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefon kontaktowy</Label>
                  <Input
                    placeholder="np. 500 100 200"
                    value={form.clientPhone}
                    onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Miejsce / Adres próby *</Label>
                  <Input
                    required
                    placeholder="np. ul. Polna 5, 00-001 Warszawa (kotłownia)"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value, clientAddress: e.target.value })}
                  />
                </div>
              </div>

              {/* Parametry techniczne */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Materiał rur</Label>
                  <Select
                    value={form.pipeMaterial}
                    onValueChange={(v: any) => setForm({ ...form, pipeMaterial: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEX">PEX / AL-PEX</SelectItem>
                      <SelectItem value="Miedź">Miedź (lut/prasowana)</SelectItem>
                      <SelectItem value="PP-R">PP-R (zgrzewany)</SelectItem>
                      <SelectItem value="Stal">Stal zaciskowa</SelectItem>
                      <SelectItem value="Inne">Inne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Ciśnienie robocze (bar)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-xs"
                    value={form.workingPressureBar}
                    onChange={(e) => setForm({ ...form, workingPressureBar: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Ciśnienie próbne (bar)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-xs font-semibold text-cyan-600"
                    value={form.testPressureBar}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm({ ...form, testPressureBar: val, initialPressureBar: val, finalPressureBar: val });
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Czas próby (min)</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Wynik odczytu */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start próby (bar)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-xs"
                    value={form.initialPressureBar}
                    onChange={(e) => {
                      const init = parseFloat(e.target.value) || 0;
                      const drop = Math.max(0, init - form.finalPressureBar);
                      setForm({ ...form, initialPressureBar: init, pressureDropBar: Math.round(drop * 100) / 100 });
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Koniec próby (bar)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-xs"
                    value={form.finalPressureBar}
                    onChange={(e) => {
                      const fin = parseFloat(e.target.value) || 0;
                      const drop = Math.max(0, form.initialPressureBar - fin);
                      setForm({
                        ...form,
                        finalPressureBar: fin,
                        pressureDropBar: Math.round(drop * 100) / 100,
                        testResult: drop === 0 ? "pozytywny" : "negatywny",
                      });
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Orzeczenie próby</Label>
                  <Select
                    value={form.testResult}
                    onValueChange={(v) => {
                      if (v) setForm({ ...form, testResult: v as "pozytywny" | "negatywny" });
                    }}
                  >
                    <SelectTrigger className={`h-8 text-xs font-bold ${form.testResult === "pozytywny" ? "text-emerald-600" : "text-red-500"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pozytywny">✓ POZYTYWNY (Szczelna)</SelectItem>
                      <SelectItem value="negatywny">✗ NEGATYWNY (Nieszczelna)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Uwagi / Zezwolenie na zalanie</Label>
                <Textarea
                  rows={2}
                  className="text-xs"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Zapisz protokół
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista protokołów */}
      <div className="grid gap-3">
        {protocols.map((proto) => {
          const isPassed = proto.testResult === "pozytywny";
          return (
            <Card key={proto.id} className="border-l-4 border-l-cyan-600 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{proto.number}</span>
                    <Badge variant={isPassed ? "default" : "destructive"} className={isPassed ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}>
                      {isPassed ? "✓ Szczelna (Pozytywny)" : "✗ Wyciek (Negatywny)"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatPlumbingDate(proto.date)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{proto.clientName}</span> · {proto.location}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Próba: <span className="font-medium text-foreground">{proto.testPressureBar} bar</span> przez <span className="font-medium text-foreground">{proto.durationMinutes} min</span> · Spadek ciśnienia: <span className={proto.pressureDropBar === 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{proto.pressureDropBar} bar</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5 border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300"
                    onClick={() => handleDownloadPDF(proto)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Pobierz PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
