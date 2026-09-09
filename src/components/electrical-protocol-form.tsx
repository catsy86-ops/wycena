"use client";

import { useState, useCallback, useMemo } from "react";
import { MeasurementProtocol, MeasurementEntry, PROTOCOL_TEMPLATES, createProtocolFromTemplate, validateProtocol, validateMeasurement } from "@/lib/electrical-protocols";
import { generateProtocolPDF, downloadProtocolPDF } from "@/lib/protocol-pdf";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Plus, Trash2, Download, CheckCircle2, AlertTriangle, AlertCircle,
  Copy, Save, Eye, Edit2, Zap, PenTool,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SignaturePad } from "@/components/quote/signature-pad";

interface ElectricalProtocolFormProps {
  protocol?: MeasurementProtocol;
  onSave?: (protocol: MeasurementProtocol) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function ElectricalProtocolForm({
  protocol: initialProtocol,
  onSave,
  onCancel,
  readOnly = false,
}: ElectricalProtocolFormProps) {
  const [protocol, setProtocol] = useState<MeasurementProtocol>(
    initialProtocol || {
      id: `proto-${Date.now()}`,
      number: `PROTO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/0001`,
      date: new Date(),
      location: "",
      clientName: "",
      clientAddress: "",
      electricianName: "",
      electricianLicense: "",
      installationType: "nowa",
      measurements: [],
      notes: "",
      status: "draft",
    }
  );

  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [activeSignaturePad, setActiveSignaturePad] = useState<"electrician" | "client" | null>(null);

  // Walidacja
  const validation = useMemo(() => validateProtocol(protocol), [protocol]);

  // Obsługa zmian
  const handleFieldChange = useCallback((field: keyof MeasurementProtocol, value: any) => {
    setProtocol((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleMeasurementChange = (id: string, field: keyof MeasurementEntry, value: any) => {
    setProtocol((prev) => ({
      ...prev,
      measurements: prev.measurements.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  };

  const handleAddMeasurement = () => {
    const newMeasurement: MeasurementEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: "voltage",
      description: "",
      location: "",
      measuredValue: "",
      unit: "V",
      status: "pass",
    };
    setProtocol((prev) => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement],
    }));
  };

  const handleRemoveMeasurement = (id: string) => {
    setProtocol((prev) => ({
      ...prev,
      measurements: prev.measurements.filter((m) => m.id !== id),
    }));
  };

  const handleLoadTemplate = (templateId: string) => {
    const newProtocol = createProtocolFromTemplate(templateId, {
      clientName: protocol.clientName,
      clientAddress: protocol.clientAddress,
      electricianName: protocol.electricianName,
      electricianLicense: protocol.electricianLicense,
      location: protocol.location,
    });
    if (newProtocol) {
      setProtocol(newProtocol);
      toast.success("Szablon załadowany");
    }
  };

  const handleSave = () => {
    if (!validation.isValid) {
      setShowValidation(true);
      toast.error("Uzupełnij wymagane pola");
      return;
    }
    onSave?.(protocol);
    toast.success("Protokół zapisany");
  };

  const handleDownloadPDF = () => {
    try {
      downloadProtocolPDF(protocol, {
        companyName: "Elektryk",
        includeSignatures: true,
        includeNotes: true,
      });
      toast.success("PDF pobrany");
    } catch (error) {
      toast.error("Błąd podczas generowania PDF");
    }
  };

  const handleDuplicate = () => {
    const newProtocol = {
      ...protocol,
      id: `proto-${Date.now()}`,
      number: `PROTO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${Math.floor(Math.random() * 10000)}`,
      status: "draft" as const,
    };
    setProtocol(newProtocol);
    toast.success("Protokół zduplikowany");
  };

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" style={{ color: "oklch(0.72 0.18 60)" }} />
            Protokół Pomiarowy
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{protocol.number}</p>
        </div>
        <div className="flex gap-2">
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="h-4 w-4" /> Duplikuj
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button size="sm" onClick={handleSave} className="btn-switch">
                <Save className="h-4 w-4" /> Zapisz
              </Button>
            </>
          )}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Zamknij
            </Button>
          )}
        </div>
      </div>

      {/* Walidacja */}
      {showValidation && validation.errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
        >
          <div className="flex gap-2 items-start">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-200">
              <div className="font-semibold mb-1">Błędy walidacji:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ostrzeżenia */}
      {validation.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
        >
          <div className="flex gap-2 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-200">
              <div className="font-semibold mb-1">Ostrzeżenia:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informacje</TabsTrigger>
          <TabsTrigger value="measurements">Pomiary ({protocol.measurements.length})</TabsTrigger>
          <TabsTrigger value="templates">Szablony</TabsTrigger>
        </TabsList>

        {/* ── Informacje ── */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dane Ogólne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Typ instalacji</Label>
                  <Select
                    value={protocol.installationType}
                    onValueChange={(v) =>
                      handleFieldChange("installationType", v as MeasurementProtocol["installationType"])
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nowa">Nowa instalacja</SelectItem>
                      <SelectItem value="modernizacja">Modernizacja</SelectItem>
                      <SelectItem value="naprawa">Naprawa</SelectItem>
                      <SelectItem value="przegląd">Przegląd okresowy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Data</Label>
                  <Input
                    type="date"
                    value={protocol.date.toISOString().split("T")[0]}
                    onChange={(e) => handleFieldChange("date", new Date(e.target.value))}
                    disabled={readOnly}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Lokalizacja</Label>
                <Input
                  placeholder="np. ul. Główna 10, Warszawa"
                  value={protocol.location}
                  onChange={(e) => handleFieldChange("location", e.target.value)}
                  disabled={readOnly}
                  className="mt-1"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Dane Klienta</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">Nazwa</Label>
                    <Input
                      placeholder="Imię i nazwisko / Nazwa firmy"
                      value={protocol.clientName}
                      onChange={(e) => handleFieldChange("clientName", e.target.value)}
                      disabled={readOnly}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Adres</Label>
                    <Input
                      placeholder="Adres klienta"
                      value={protocol.clientAddress}
                      onChange={(e) => handleFieldChange("clientAddress", e.target.value)}
                      disabled={readOnly}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Dane Elektryka</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">Imię i Nazwisko</Label>
                    <Input
                      placeholder="Imię i nazwisko elektryka"
                      value={protocol.electricianName}
                      onChange={(e) => handleFieldChange("electricianName", e.target.value)}
                      disabled={readOnly}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Numer Licencji</Label>
                    <Input
                      placeholder="np. SEP/2024/12345"
                      value={protocol.electricianLicense}
                      onChange={(e) => handleFieldChange("electricianLicense", e.target.value)}
                      disabled={readOnly}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Podpisy Cyfrowe (E-Podpis)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Podpis Elektryka */}
                  <div className="p-3 border rounded-lg bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Podpis Elektryka</Label>
                      {protocol.signatureElectrician && (
                        <Badge variant="default" className="text-[10px]">
                          Złożony
                        </Badge>
                      )}
                    </div>
                    {protocol.signatureElectrician ? (
                      <div className="space-y-2">
                        <div className="h-20 bg-slate-50 dark:bg-slate-900 border rounded flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={protocol.signatureElectrician}
                            alt="Podpis elektryka"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        {!readOnly && (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setActiveSignaturePad("electrician")}
                            >
                              <PenTool className="h-3 w-3 mr-1" /> Zmień
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-red-500 hover:text-red-600"
                              onClick={() => handleFieldChange("signatureElectrician", undefined)}
                            >
                              Usuń
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-20 border border-dashed rounded flex flex-col items-center justify-center text-muted-foreground gap-1 p-2">
                        <p className="text-xs">Brak podpisu elektryka</p>
                        {!readOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setActiveSignaturePad("electrician")}
                          >
                            <PenTool className="h-3 w-3 mr-1" /> Złóż podpis
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Podpis Klienta */}
                  <div className="p-3 border rounded-lg bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Podpis Klienta / Odbiorcy</Label>
                      {protocol.signatureClient && (
                        <Badge variant="default" className="text-[10px]">
                          Złożony
                        </Badge>
                      )}
                    </div>
                    {protocol.signatureClient ? (
                      <div className="space-y-2">
                        <div className="h-20 bg-slate-50 dark:bg-slate-900 border rounded flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={protocol.signatureClient}
                            alt="Podpis klienta"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        {!readOnly && (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setActiveSignaturePad("client")}
                            >
                              <PenTool className="h-3 w-3 mr-1" /> Zmień
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-red-500 hover:text-red-600"
                              onClick={() => handleFieldChange("signatureClient", undefined)}
                            >
                              Usuń
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-20 border border-dashed rounded flex flex-col items-center justify-center text-muted-foreground gap-1 p-2">
                        <p className="text-xs">Brak podpisu klienta</p>
                        {!readOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setActiveSignaturePad("client")}
                          >
                            <PenTool className="h-3 w-3 mr-1" /> Złóż podpis
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal padu do podpisu */}
              {activeSignaturePad && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md bg-background rounded-lg shadow-xl overflow-hidden">
                    <SignaturePad
                      onSign={(dataUrl) => {
                        if (activeSignaturePad === "electrician") {
                          handleFieldChange("signatureElectrician", dataUrl);
                        } else {
                          handleFieldChange("signatureClient", dataUrl);
                        }
                        handleFieldChange("signatureDate", new Date());
                        handleFieldChange("status", "signed");
                        setActiveSignaturePad(null);
                        toast.success("Podpis został zapisany");
                      }}
                      onCancel={() => setActiveSignaturePad(null)}
                      existingSignature={
                        activeSignaturePad === "electrician"
                          ? protocol.signatureElectrician
                          : protocol.signatureClient
                      }
                    />
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-xs font-semibold">Uwagi</Label>
                <Textarea
                  placeholder="Dodatkowe uwagi do protokołu..."
                  value={protocol.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  disabled={readOnly}
                  className="mt-1 min-h-24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pomiary ── */}
        <TabsContent value="measurements" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Wyniki Pomiarów</h3>
            {!readOnly && (
              <Button size="sm" onClick={handleAddMeasurement} className="btn-switch">
                <Plus className="h-4 w-4" /> Dodaj pomiar
              </Button>
            )}
          </div>

          <AnimatePresence>
            {protocol.measurements.length === 0 ? (
              <Card className="text-center py-12">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">Brak pomiarów. Dodaj pomiary lub załaduj szablon.</p>
              </Card>
            ) : (
              protocol.measurements.map((measurement, idx) => {
                const validation = validateMeasurement(measurement);
                const isEditing = editingMeasurement === measurement.id;

                return (
                  <motion.div
                    key={measurement.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Card className={`${!validation.isValid ? "border-red-200 dark:border-red-800" : ""}`}>
                      <CardContent className="pt-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Typ pomiaru</Label>
                                <Select
                                  value={measurement.type}
                                  onValueChange={(v) =>
                                    handleMeasurementChange(measurement.id, "type", v as MeasurementEntry["type"])
                                  }
                                >
                                  <SelectTrigger className="mt-1 h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="voltage">Napięcie</SelectItem>
                                    <SelectItem value="current">Prąd</SelectItem>
                                    <SelectItem value="resistance">Rezystancja</SelectItem>
                                    <SelectItem value="continuity">Ciągłość</SelectItem>
                                    <SelectItem value="earthing">Uziemienie</SelectItem>
                                    <SelectItem value="insulation">Izolacja</SelectItem>
                                    <SelectItem value="rcd">RCD</SelectItem>
                                    <SelectItem value="breaker">Wyłącznik</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Status</Label>
                                <Select
                                  value={measurement.status}
                                  onValueChange={(v) =>
                                    handleMeasurementChange(measurement.id, "status", v as MeasurementEntry["status"])
                                  }
                                >
                                  <SelectTrigger className="mt-1 h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pass">✓ Prawidłowy</SelectItem>
                                    <SelectItem value="warning">⚠ Ostrzeżenie</SelectItem>
                                    <SelectItem value="fail">✗ Nieprawidłowy</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">Opis</Label>
                              <Input
                                placeholder="Opis pomiaru"
                                value={measurement.description}
                                onChange={(e) =>
                                  handleMeasurementChange(measurement.id, "description", e.target.value)
                                }
                                className="mt-1 h-9"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Lokalizacja</Label>
                                <Input
                                  placeholder="np. Rozdzielnica główna"
                                  value={measurement.location}
                                  onChange={(e) =>
                                    handleMeasurementChange(measurement.id, "location", e.target.value)
                                  }
                                  className="mt-1 h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Jednostka</Label>
                                <Input
                                  placeholder="V, A, Ω, mA..."
                                  value={measurement.unit}
                                  onChange={(e) =>
                                    handleMeasurementChange(measurement.id, "unit", e.target.value)
                                  }
                                  className="mt-1 h-9"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Wartość oczekiwana</Label>
                                <Input
                                  placeholder="np. 230V ±10%"
                                  value={measurement.expectedValue || ""}
                                  onChange={(e) =>
                                    handleMeasurementChange(measurement.id, "expectedValue", e.target.value)
                                  }
                                  className="mt-1 h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Wartość zmierzona *</Label>
                                <Input
                                  placeholder="Wartość zmierzona"
                                  value={measurement.measuredValue}
                                  onChange={(e) =>
                                    handleMeasurementChange(measurement.id, "measuredValue", e.target.value)
                                  }
                                  className="mt-1 h-9"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">Norma</Label>
                              <Input
                                placeholder="np. PN-HD 60364-5-52"
                                value={measurement.norm || ""}
                                onChange={(e) =>
                                  handleMeasurementChange(measurement.id, "norm", e.target.value)
                                }
                                className="mt-1 h-9"
                              />
                            </div>

                            <div>
                              <Label className="text-xs">Uwagi</Label>
                              <Input
                                placeholder="Dodatkowe uwagi"
                                value={measurement.notes || ""}
                                onChange={(e) =>
                                  handleMeasurementChange(measurement.id, "notes", e.target.value)
                                }
                                className="mt-1 h-9"
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => setEditingMeasurement(null)}
                                className="btn-switch"
                              >
                                <Save className="h-4 w-4" /> Gotowe
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveMeasurement(measurement.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Usuń
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold">{idx + 1}. {measurement.description}</span>
                                <Badge
                                  variant={
                                    measurement.status === "pass"
                                      ? "default"
                                      : measurement.status === "warning"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {measurement.status === "pass"
                                    ? "✓ OK"
                                    : measurement.status === "warning"
                                      ? "⚠ Ostrzeżenie"
                                      : "✗ Błąd"}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Lokalizacja:</span> {measurement.location}
                                </div>
                                <div>
                                  <span className="font-medium">Typ:</span> {measurement.type}
                                </div>
                                <div>
                                  <span className="font-medium">Zmierzona:</span> {measurement.measuredValue}{" "}
                                  {measurement.unit}
                                </div>
                                <div>
                                  <span className="font-medium">Oczekiwana:</span> {measurement.expectedValue || "-"}
                                </div>
                              </div>
                              {measurement.notes && (
                                <div className="text-sm text-muted-foreground mt-2">
                                  <span className="font-medium">Uwagi:</span> {measurement.notes}
                                </div>
                              )}
                              {!validation.isValid && (
                                <div className="text-xs text-red-600 mt-2">
                                  {validation.errors.map((err, i) => (
                                    <div key={i}>• {err}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {!readOnly && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingMeasurement(measurement.id)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </TabsContent>

        {/* ── Szablony ── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid gap-3">
            {PROTOCOL_TEMPLATES.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{template.measurements.length} pomiarów</Badge>
                        <Badge variant="outline">{template.relatedNorms.length} norm</Badge>
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        size="sm"
                        onClick={() => handleLoadTemplate(template.id)}
                        className="btn-switch"
                      >
                        <Plus className="h-4 w-4" /> Załaduj
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
