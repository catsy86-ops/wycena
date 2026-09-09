"use client";

import { useState, useCallback } from "react";
import { useSettingsStore } from "@/store/settings-store";
import { generateMeasurementProtocolPdf, type MeasurementData } from "@/lib/export-measurement-protocol";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Download, CheckCircle2, AlertCircle, FileText,
  Zap, User, Gauge, Shield, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface InsulationMeasurement {
  id: string;
  circuit: string;
  phase?: string;
  resistance: number;
  minRequired?: number;
  pass: boolean;
}

interface ProtectionMeasurement {
  id: string;
  circuit: string;
  resistance: number;
  maxAllowed?: number;
  pass: boolean;
}

interface VoltageCurrentMeasurement {
  id: string;
  circuit: string;
  voltage?: number;
  current?: number;
  power?: number;
  powerFactor?: number;
}

export function MeasurementProtocolForm() {
  const settings = useSettingsStore((s) => s.settings);

  // Dane instalacji
  const [installationAddress, setInstallationAddress] = useState("");
  const [installationType, setInstallationType] = useState<"mieszkanie" | "dom" | "biuro" | "hala" | "inne">("mieszkanie");
  const [installationArea, setInstallationArea] = useState("");
  const [voltage, setVoltage] = useState<"230V" | "400V" | "230/400V">("230/400V");
  const [phases, setPhases] = useState<1 | 3>(3);
  const [mainBreaker, setMainBreaker] = useState("");

  // Dane elektryka
  const [electricianName, setElectricianName] = useState("");
  const [electricianLicense, setElectricianLicense] = useState("");
  const [electricianPhone, setElectricianPhone] = useState("");

  // Pomiary
  const [insulationMeasurements, setInsulationMeasurements] = useState<InsulationMeasurement[]>([
    { id: "1", circuit: "Obwód 1 - Oświetlenie", phase: "L1", resistance: 2.5, minRequired: 0.5, pass: true },
  ]);

  const [protectionMeasurements, setProtectionMeasurements] = useState<ProtectionMeasurement[]>([
    { id: "1", circuit: "Obwód 1 - Oświetlenie", resistance: 0.8, maxAllowed: 2.1, pass: true },
  ]);

  const [voltageMeasurements, setVoltageMeasurements] = useState<VoltageCurrentMeasurement[]>([
    { id: "1", circuit: "Obwód 1 - Oświetlenie", voltage: 230, current: 5, power: 1150, powerFactor: 0.95 },
  ]);

  const [measurementDate, setMeasurementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nextMeasurementDate, setNextMeasurementDate] = useState("");
  const [installationPassed, setInstallationPassed] = useState(true);
  const [notes, setNotes] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [newRecommendation, setNewRecommendation] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);

  // ─── Pomiary rezystancji izolacji ─────────────────────────────────────────

  const addInsulationMeasurement = useCallback(() => {
    const newId = String(Math.max(...insulationMeasurements.map((m) => parseInt(m.id) || 0), 0) + 1);
    setInsulationMeasurements([
      ...insulationMeasurements,
      { id: newId, circuit: "", phase: "L1", resistance: 0.5, minRequired: 0.5, pass: true },
    ]);
  }, [insulationMeasurements]);

  const updateInsulationMeasurement = useCallback(
    (id: string, field: keyof InsulationMeasurement, value: any) => {
      setInsulationMeasurements(
        insulationMeasurements.map((m) =>
          m.id === id
            ? {
                ...m,
                [field]: value,
                pass: field === "resistance" ? value >= (m.minRequired || 0.5) : m.pass,
              }
            : m
        )
      );
    },
    [insulationMeasurements]
  );

  const removeInsulationMeasurement = useCallback(
    (id: string) => {
      setInsulationMeasurements(insulationMeasurements.filter((m) => m.id !== id));
    },
    [insulationMeasurements]
  );

  // ─── Pomiary skuteczności ochrony ─────────────────────────────────────────

  const addProtectionMeasurement = useCallback(() => {
    const newId = String(Math.max(...protectionMeasurements.map((m) => parseInt(m.id) || 0), 0) + 1);
    setProtectionMeasurements([
      ...protectionMeasurements,
      { id: newId, circuit: "", resistance: 0.5, maxAllowed: 2.1, pass: true },
    ]);
  }, [protectionMeasurements]);

  const updateProtectionMeasurement = useCallback(
    (id: string, field: keyof ProtectionMeasurement, value: any) => {
      setProtectionMeasurements(
        protectionMeasurements.map((m) =>
          m.id === id
            ? {
                ...m,
                [field]: value,
                pass: field === "resistance" ? value <= (m.maxAllowed || 2.1) : m.pass,
              }
            : m
        )
      );
    },
    [protectionMeasurements]
  );

  const removeProtectionMeasurement = useCallback(
    (id: string) => {
      setProtectionMeasurements(protectionMeasurements.filter((m) => m.id !== id));
    },
    [protectionMeasurements]
  );

  // ─── Pomiary napięcia, prądu, mocy ─────────────────────────────────────────

  const addVoltageMeasurement = useCallback(() => {
    const newId = String(Math.max(...voltageMeasurements.map((m) => parseInt(m.id) || 0), 0) + 1);
    setVoltageMeasurements([
      ...voltageMeasurements,
      { id: newId, circuit: "", voltage: 230, current: 0, power: 0, powerFactor: 1 },
    ]);
  }, [voltageMeasurements]);

  const updateVoltageMeasurement = useCallback(
    (id: string, field: keyof VoltageCurrentMeasurement, value: any) => {
      setVoltageMeasurements(
        voltageMeasurements.map((m) =>
          m.id === id ? { ...m, [field]: value } : m
        )
      );
    },
    [voltageMeasurements]
  );

  const removeVoltageMeasurement = useCallback(
    (id: string) => {
      setVoltageMeasurements(voltageMeasurements.filter((m) => m.id !== id));
    },
    [voltageMeasurements]
  );

  // ─── Rekomendacje ─────────────────────────────────────────────────────────

  const addRecommendation = useCallback(() => {
    if (newRecommendation.trim()) {
      setRecommendations([...recommendations, newRecommendation]);
      setNewRecommendation("");
    }
  }, [recommendations, newRecommendation]);

  const removeRecommendation = useCallback(
    (index: number) => {
      setRecommendations(recommendations.filter((_, i) => i !== index));
    },
    [recommendations]
  );

  // ─── Generowanie PDF ───────────────────────────────────────────────────────

  const handleGeneratePdf = async () => {
    if (!installationAddress.trim()) {
      toast.error("Podaj adres instalacji");
      return;
    }
    if (!electricianName.trim()) {
      toast.error("Podaj imię i nazwisko elektryka");
      return;
    }

    setIsGenerating(true);
    try {
      const measurementData: MeasurementData = {
        installationAddress,
        installationType,
        installationArea: installationArea ? parseInt(installationArea) : undefined,
        voltage,
        phases,
        mainBreaker: mainBreaker || undefined,
        electricianName,
        electricianLicense: electricianLicense || undefined,
        electricianPhone: electricianPhone || undefined,
        insulationResistance: insulationMeasurements,
        protectionEffectiveness: protectionMeasurements,
        measurements: voltageMeasurements,
        measurementDate: new Date(measurementDate),
        nextMeasurementDate: nextMeasurementDate ? new Date(nextMeasurementDate) : undefined,
        installationPassed,
        notes: notes || undefined,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      };

      const blob = await generateMeasurementProtocolPdf(measurementData, settings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Protokol_pomiarowy_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Protokół pomiarowy wygenerowany");
    } catch (error) {
      console.error(error);
      toast.error("Błąd podczas generowania protokołu");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Walidacja ─────────────────────────────────────────────────────────────

  const allInsulationPass = insulationMeasurements.every((m) => m.pass);
  const allProtectionPass = protectionMeasurements.every((m) => m.pass);
  const shouldPass = allInsulationPass && allProtectionPass;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Protokół Pomiarowy
          </CardTitle>
          <CardDescription>
            Generuj protokół odbioru instalacji elektrycznej wg PN-HD 60364-6-61
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="installation" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="installation" className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Instalacja</span>
              </TabsTrigger>
              <TabsTrigger value="electrician" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Elektryk</span>
              </TabsTrigger>
              <TabsTrigger value="insulation" className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Izolacja</span>
              </TabsTrigger>
              <TabsTrigger value="protection" className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Ochrona</span>
              </TabsTrigger>
              <TabsTrigger value="voltage" className="flex items-center gap-1">
                <Gauge className="w-4 h-4" />
                <span className="hidden sm:inline">Pomiary</span>
              </TabsTrigger>
            </TabsList>

            {/* ─── Dane instalacji ─────────────────────────────────────────────────── */}
            <TabsContent value="installation" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Adres instalacji *</label>
                  <Input
                    value={installationAddress}
                    onChange={(e) => setInstallationAddress(e.target.value)}
                    placeholder="ul. Przykładowa 1, 00-000 Warszawa"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Typ instalacji</label>
                  <Select value={installationType} onValueChange={(v: any) => setInstallationType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mieszkanie">Mieszkanie</SelectItem>
                      <SelectItem value="dom">Dom jednorodzinny</SelectItem>
                      <SelectItem value="biuro">Biuro</SelectItem>
                      <SelectItem value="hala">Hala produkcyjna</SelectItem>
                      <SelectItem value="inne">Inne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Powierzchnia (m²)</label>
                  <Input
                    type="number"
                    value={installationArea}
                    onChange={(e) => setInstallationArea(e.target.value)}
                    placeholder="60"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Napięcie zasilania</label>
                  <Select value={voltage} onValueChange={(v: any) => setVoltage(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="230V">230V (1f)</SelectItem>
                      <SelectItem value="400V">400V (3f)</SelectItem>
                      <SelectItem value="230/400V">230/400V (3f)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Liczba faz</label>
                  <Select value={String(phases)} onValueChange={(v) => { if (v) setPhases(parseInt(v, 10) as 1 | 3); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 faza</SelectItem>
                      <SelectItem value="3">3 fazy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Główny wyłącznik</label>
                  <Input
                    value={mainBreaker}
                    onChange={(e) => setMainBreaker(e.target.value)}
                    placeholder="np. B32, C40"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ─── Dane elektryka ──────────────────────────────────────────────────── */}
            <TabsContent value="electrician" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Imię i nazwisko *</label>
                  <Input
                    value={electricianName}
                    onChange={(e) => setElectricianName(e.target.value)}
                    placeholder="Jan Kowalski"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Nr uprawnień</label>
                  <Input
                    value={electricianLicense}
                    onChange={(e) => setElectricianLicense(e.target.value)}
                    placeholder="np. E.1.1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Telefon</label>
                  <Input
                    value={electricianPhone}
                    onChange={(e) => setElectricianPhone(e.target.value)}
                    placeholder="+48 123 456 789"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Data pomiaru</label>
                  <Input
                    type="date"
                    value={measurementDate}
                    onChange={(e) => setMeasurementDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Następny pomiar (zalecany)</label>
                  <Input
                    type="date"
                    value={nextMeasurementDate}
                    onChange={(e) => setNextMeasurementDate(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ─── Pomiary rezystancji izolacji ────────────────────────────────────── */}
            <TabsContent value="insulation" className="space-y-4 mt-4">
              <div className="space-y-3">
                {insulationMeasurements.map((m) => (
                  <div key={m.id} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Obwód</label>
                      <Input
                        size={1}
                        value={m.circuit}
                        onChange={(e) => updateInsulationMeasurement(m.id, "circuit", e.target.value)}
                        placeholder="Obwód 1 - Oświetlenie"
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-xs font-medium">Faza</label>
                      <Select value={m.phase || "L1"} onValueChange={(v) => updateInsulationMeasurement(m.id, "phase", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L1">L1</SelectItem>
                          <SelectItem value="L2">L2</SelectItem>
                          <SelectItem value="L3">L3</SelectItem>
                          <SelectItem value="N">N</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24">
                      <label className="text-xs font-medium">Pomiar (MΩ)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={m.resistance}
                        onChange={(e) => updateInsulationMeasurement(m.id, "resistance", parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-xs font-medium">Min (MΩ)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={m.minRequired || 0.5}
                        onChange={(e) => updateInsulationMeasurement(m.id, "minRequired", parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="w-12">
                      {m.pass ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInsulationMeasurement(m.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={addInsulationMeasurement} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj pomiar
              </Button>
            </TabsContent>

            {/* ─── Pomiary skuteczności ochrony ────────────────────────────────────── */}
            <TabsContent value="protection" className="space-y-4 mt-4">
              <div className="space-y-3">
                {protectionMeasurements.map((m) => (
                  <div key={m.id} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Obwód</label>
                      <Input
                        size={1}
                        value={m.circuit}
                        onChange={(e) => updateProtectionMeasurement(m.id, "circuit", e.target.value)}
                        placeholder="Obwód 1 - Oświetlenie"
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-xs font-medium">Pomiar (mΩ)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={m.resistance}
                        onChange={(e) => updateProtectionMeasurement(m.id, "resistance", parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-xs font-medium">Max (mΩ)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={m.maxAllowed || 2.1}
                        onChange={(e) => updateProtectionMeasurement(m.id, "maxAllowed", parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="w-12">
                      {m.pass ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProtectionMeasurement(m.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={addProtectionMeasurement} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj pomiar
              </Button>
            </TabsContent>

            {/* ─── Pomiary napięcia, prądu, mocy ───────────────────────────────────── */}
            <TabsContent value="voltage" className="space-y-4 mt-4">
              <div className="space-y-3">
                {voltageMeasurements.map((m) => (
                  <div key={m.id} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Obwód</label>
                      <Input
                        size={1}
                        value={m.circuit}
                        onChange={(e) => updateVoltageMeasurement(m.id, "circuit", e.target.value)}
                        placeholder="Obwód 1 - Oświetlenie"
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-xs font-medium">U (V)</label>
                      <Input
                        type="number"
                        value={m.voltage || ""}
                        onChange={(e) => updateVoltageMeasurement(m.id, "voltage", e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-xs font-medium">I (A)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={m.current || ""}
                        onChange={(e) => updateVoltageMeasurement(m.id, "current", e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-xs font-medium">P (W)</label>
                      <Input
                        type="number"
                        value={m.power || ""}
                        onChange={(e) => updateVoltageMeasurement(m.id, "power", e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-xs font-medium">cos φ</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={m.powerFactor || ""}
                        onChange={(e) => updateVoltageMeasurement(m.id, "powerFactor", e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVoltageMeasurement(m.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={addVoltageMeasurement} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj pomiar
              </Button>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Uwagi</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dodatkowe uwagi dotyczące pomiaru..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Rekomendacje</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newRecommendation}
                      onChange={(e) => setNewRecommendation(e.target.value)}
                      placeholder="Dodaj rekomendację..."
                      onKeyPress={(e) => e.key === "Enter" && addRecommendation()}
                    />
                    <Button onClick={addRecommendation} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-sm">{rec}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecommendation(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Wynik odbioru</p>
                    <p className="text-xs text-slate-600">
                      {shouldPass ? "Instalacja przeszła wszystkie pomiary" : "Instalacja nie przeszła wszystkich pomiarów"}
                    </p>
                  </div>
                  <Button
                    variant={shouldPass ? "default" : "destructive"}
                    size="sm"
                    onClick={() => setInstallationPassed(!installationPassed)}
                  >
                    {installationPassed ? "✓ Przeszła" : "✗ Nie przeszła"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="flex-1"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generowanie..." : "Pobierz PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
