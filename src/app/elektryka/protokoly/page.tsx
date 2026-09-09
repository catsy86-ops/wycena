"use client";

import { useState, useMemo, useEffect } from "react";
import { useProtocolStore } from "@/store/protocol-store";
import { MeasurementProtocol } from "@/lib/electrical-protocols";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, Search, Download, Eye, Trash2, Edit2,
  CheckCircle2, AlertTriangle, AlertCircle, Zap, Receipt, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";
import { ElectricalProtocolForm } from "@/components/electrical-protocol-form";
import { downloadProtocolPDF } from "@/lib/protocol-pdf";
import { formatProtocolDate } from "@/lib/electrical-protocols";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInvoiceStore } from "@/store/invoice-store";
import type { QuoteItem } from "@/types";

// Mock data - w rzeczywistości byłoby z bazy danych
const MOCK_PROTOCOLS: MeasurementProtocol[] = [
  {
    id: "proto-1",
    number: "PROTO/2024/12/0001",
    date: new Date("2024-12-15"),
    location: "ul. Główna 10, Warszawa",
    clientName: "Jan Kowalski",
    clientAddress: "ul. Główna 10, 00-001 Warszawa",
    electricianName: "Piotr Nowak",
    electricianLicense: "SEP/2024/12345",
    installationType: "nowa",
    measurements: [
      {
        id: "m1",
        type: "voltage",
        description: "Napięcie zasilające",
        location: "Rozdzielnica główna",
        expectedValue: "230V ±10%",
        measuredValue: "230.5",
        unit: "V",
        status: "pass",
        norm: "PN-EN 50160",
      },
      {
        id: "m2",
        type: "insulation",
        description: "Rezystancja izolacji",
        location: "Wszystkie obwody",
        expectedValue: "> 1 MΩ",
        measuredValue: "2.5",
        unit: "MΩ",
        status: "pass",
        norm: "PN-HD 60364-6-61",
      },
    ],
    notes: "Instalacja przebiegła prawidłowo",
    status: "completed",
    signatureDate: new Date("2024-12-15"),
    signatureElectrician: "Piotr Nowak",
    signatureClient: "Jan Kowalski",
  },
  {
    id: "proto-2",
    number: "PROTO/2024/12/0002",
    date: new Date("2024-12-16"),
    location: "ul. Boczna 5, Kraków",
    clientName: "Maria Lewandowska",
    clientAddress: "ul. Boczna 5, 30-001 Kraków",
    electricianName: "Piotr Nowak",
    electricianLicense: "SEP/2024/12345",
    installationType: "modernizacja",
    measurements: [
      {
        id: "m3",
        type: "voltage",
        description: "Napięcie zasilające",
        location: "Rozdzielnica główna",
        expectedValue: "230V ±10%",
        measuredValue: "228.0",
        unit: "V",
        status: "pass",
        norm: "PN-EN 50160",
      },
      {
        id: "m4",
        type: "rcd",
        description: "Test wyłącznika RCD",
        location: "RCD główny",
        expectedValue: "< 30 mA",
        measuredValue: "25",
        unit: "mA",
        status: "pass",
        norm: "PN-EN 61008-1",
      },
    ],
    notes: "Modernizacja ukończona",
    status: "completed",
  },
];

export default function ProtokołyPage() {
  const router = useRouter();
  const { protocols, add, update, remove, load } = useProtocolStore();
  const { add: addInvoice } = useInvoiceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "completed" | "signed">("all");
  const [selectedProtocol, setSelectedProtocol] = useState<MeasurementProtocol | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleSeedExample = async () => {
    for (const p of MOCK_PROTOCOLS) {
      await add(p);
    }
    toast.success("Załadowano przykładowe protokoły");
  };

  const handleCreateInvoiceFromProtocol = async (protocol: MeasurementProtocol) => {
    try {
      setIsGeneratingInvoice(protocol.id);

      // Usługi pomiarowe wygenerowane z protokołu
      const items: QuoteItem[] = [];
      const measurementCount = protocol.measurements.length;

      // Pozycja główna - wykonanie pomiarów instalacji i sporządzenie protokołu
      const baseFee = protocol.installationType === "nowa" ? 350 : 280;
      items.push({
        id: "proto-base-" + Date.now(),
        name: `Pomiary odbiorcze i sporządzenie protokołu nr ${protocol.number} (${protocol.installationType})`,
        quantity: 1,
        unit: "kpl",
        priceNettoPerUnit: baseFee,
        vatRate: 23,
        discountPercent: 0,
        nettotal: baseFee,
        vatAmount: Math.round(baseFee * 0.23 * 100) / 100,
        bruttoTotal: Math.round(baseFee * 1.23 * 100) / 100,
      });

      // Punkty pomiarowe jednostkowe
      if (measurementCount > 0) {
        const perPointRate = 25; // 25 PLN netto za pojedynczy punkt pomiarowy
        const totalPointsNetto = measurementCount * perPointRate;
        items.push({
          id: "proto-points-" + Date.now(),
          name: `Wykonanie prób i pomiarów w punktach kontrolnych (ilość obwodów/punktów: ${measurementCount})`,
          quantity: measurementCount,
          unit: "szt",
          priceNettoPerUnit: perPointRate,
          vatRate: 23,
          discountPercent: 0,
          nettotal: totalPointsNetto,
          vatAmount: Math.round(totalPointsNetto * 0.23 * 100) / 100,
          bruttoTotal: Math.round(totalPointsNetto * 1.23 * 100) / 100,
        });
      }

      const totalNetto = items.reduce((sum, item) => sum + item.nettotal, 0);
      const totalVat = items.reduce((sum, item) => sum + item.vatAmount, 0);
      const totalBrutto = items.reduce((sum, item) => sum + item.bruttoTotal, 0);

      const now = new Date();
      const dueDate = new Date();
      dueDate.setDate(now.getDate() + 14);

      await addInvoice({
        clientName: protocol.clientName || "Klient",
        clientAddress: protocol.clientAddress || protocol.location || "",
        items,
        additionalCosts: [],
        totalNetto,
        totalVat,
        totalBrutto,
        status: "niezaplacona",
        issueDate: now,
        dueDate,
      });

      toast.success(`Wystawiono fakturę dla protokołu ${protocol.number}! Przekierowywanie do faktur...`);
      router.push("/faktury");
    } catch (err) {
      console.error(err);
      toast.error("Wystąpił błąd podczas tworzenia faktury z protokołu");
    } finally {
      setIsGeneratingInvoice(null);
    }
  };

  // Filtrowanie
  const filteredProtocols = useMemo(() => {
    return protocols.filter((p) => {
      const matchesSearch =
        p.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [protocols, searchTerm, statusFilter]);

  // Statystyki
  const stats = useMemo(() => {
    const total = protocols.length;
    const completed = protocols.filter((p) => p.status === "completed").length;
    const draft = protocols.filter((p) => p.status === "draft").length;
    const signed = protocols.filter((p) => p.status === "signed").length;

    return { total, completed, draft, signed };
  }, [protocols]);

  const handleSaveProtocol = async (protocol: MeasurementProtocol) => {
    if (selectedProtocol) {
      await update(protocol.id, protocol);
      toast.success("Protokół zaktualizowany");
    } else {
      await add(protocol);
      toast.success("Protokół utworzony");
    }
    setShowForm(false);
    setSelectedProtocol(null);
  };

  const handleDeleteProtocol = async (id: string) => {
    await remove(id);
    toast.success("Protokół usunięty");
  };

  const handleDownloadPDF = (protocol: MeasurementProtocol) => {
    try {
      downloadProtocolPDF(protocol, {
        companyName: "Elektryk",
        includeSignatures: true,
        includeNotes: true,
      });
      toast.success("PDF pobrany");
    } catch (error) {
    }
  };

  const handleExportExcel = async (protocol?: MeasurementProtocol) => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      if (protocol) {
        // Eksport pojedynczego protokołu z pełnymi pomiarami
        const metaRows = [
          ["PROTOKÓŁ POMIARÓW ELEKTRYCZNYCH (SEP)", ""],
          ["Numer protokołu:", protocol.number],
          ["Data badania:", formatProtocolDate(protocol.date)],
          ["Klient:", protocol.clientName],
          ["Adres obiektu:", protocol.clientAddress || protocol.location],
          ["Elektryk wykonujący:", protocol.electricianName],
          ["Uprawnienia SEP:", protocol.electricianLicense],
          ["Typ instalacji:", protocol.installationType],
          ["Status:", protocol.status],
          [],
          ["WYNIKI BADAŃ I POMIARÓW OBWODÓW"],
          ["Lp.", "Rodzaj pomiaru", "Lokalizacja / Obwód", "Wartość zmierzona", "Jednostka", "Wartość dopuszczalna", "Norma SEP", "Wynik próby", "Uwagi"]
        ];

        const measurementRows = protocol.measurements.map((m, idx) => [
          idx + 1,
          m.description || m.type,
          m.location,
          m.measuredValue,
          m.unit,
          m.expectedValue || "-",
          m.norm || "-",
          m.status === "pass" ? "Pozytywny (OK)" : m.status === "warning" ? "Ostrzeżenie" : "Negatywny (Błąd)",
          m.notes || "-"
        ]);

        const ws = XLSX.utils.aoa_to_sheet([...metaRows, ...measurementRows]);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 30 },
          { wch: 25 },
          { wch: 18 },
          { wch: 10 },
          { wch: 22 },
          { wch: 20 },
          { wch: 18 },
          { wch: 25 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Protokół pomiarowy");
        XLSX.writeFile(wb, `Protokol_${protocol.number.replace(/\//g, "-")}.xlsx`);
        toast.success(`Wyeksportowano arkusz Excel dla protokołu ${protocol.number}`);
      } else {
        // Zbiorczy rejestr wszystkich protokołów
        const summaryRows = [
          ["REJESTR PROTOKOŁÓW POMIAROWYCH SEP", "", "", "", "", "", ""],
          ["Wygenerowano:", formatProtocolDate(new Date())],
          [],
          ["Numer", "Data", "Klient", "Lokalizacja", "Typ instalacji", "Status", "Pomiary OK", "Błędy", "Uprawnienia SEP"]
        ];

        protocols.forEach((p) => {
          const ok = p.measurements.filter((m) => m.status === "pass").length;
          const err = p.measurements.filter((m) => m.status === "fail").length;
          summaryRows.push([
            p.number,
            formatProtocolDate(p.date),
            p.clientName,
            p.location,
            p.installationType,
            p.status,
            ok as any,
            err as any,
            p.electricianLicense
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(summaryRows);
        ws["!cols"] = [
          { wch: 22 },
          { wch: 12 },
          { wch: 25 },
          { wch: 30 },
          { wch: 18 },
          { wch: 12 },
          { wch: 12 },
          { wch: 10 },
          { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Rejestr protokołów");
        XLSX.writeFile(wb, `Rejestr_protokolow_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("Wyeksportowano zbiorczy rejestr protokołów do Excela");
      }
    } catch (err) {
      console.error(err);
      toast.error("Błąd podczas eksportu do arkusza Excel");
    }
  };

  if (showForm) {
    return (
      <PageTransition>
        <ElectricalProtocolForm
          protocol={selectedProtocol || undefined}
          onSave={handleSaveProtocol}
          onCancel={() => {
            setShowForm(false);
            setSelectedProtocol(null);
          }}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        {/* Nagłówek */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-electrical">
                <FileText className="inline h-7 w-7 mr-2" style={{ color: "oklch(0.72 0.18 60)" }} />
                Protokoły Pomiarowe
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Zarządzanie protokołami pomiarów elektrycznych</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportExcel()}
                className="btn-glass"
                title="Eksportuj zbiorczy rejestr do Excela"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-500" />
                Eksport rejestru Excel
              </Button>
              <Button
                onClick={() => {
                  setSelectedProtocol(null);
                  setShowForm(true);
                }}
                className="btn-switch"
              >
                <Plus className="h-4 w-4" /> Nowy protokół
              </Button>
            </div>
          </div>
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Razem</div>
                  </div>
                  <FileText className="h-5 w-5" style={{ color: "oklch(0.72 0.18 60)" }} />
                </div>
              </CardContent>
            </Card>
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black">{stats.completed}</div>
                    <div className="text-xs text-muted-foreground">Ukończone</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black">{stats.draft}</div>
                    <div className="text-xs text-muted-foreground">Szkice</div>
                  </div>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black">{stats.signed}</div>
                    <div className="text-xs text-muted-foreground">Podpisane</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Filtry */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po numerze, kliencie, lokalizacji..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 input-electrical"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Wszystkie</TabsTrigger>
                <TabsTrigger value="draft">Szkice</TabsTrigger>
                <TabsTrigger value="completed">Ukończone</TabsTrigger>
                <TabsTrigger value="signed">Podpisane</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </StaggerItem>

        {/* Lista protokołów */}
        <StaggerItem>
          {filteredProtocols.length === 0 ? (
            <Card className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30 text-amber-500" />
              <p className="text-muted-foreground mb-4">Brak protokołów spełniających kryteria wyszukiwania</p>
              {protocols.length === 0 && (
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleSeedExample}>
                    Załaduj przykładowy protokół
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredProtocols.map((protocol, idx) => {
                const passedCount = protocol.measurements.filter((m) => m.status === "pass").length;
                const failedCount = protocol.measurements.filter((m) => m.status === "fail").length;
                const warningCount = protocol.measurements.filter((m) => m.status === "warning").length;

                return (
                  <motion.div
                    key={protocol.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="card-electrical hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{protocol.number}</h3>
                              <Badge
                                variant={
                                  protocol.status === "completed"
                                    ? "default"
                                    : protocol.status === "signed"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {protocol.status === "draft"
                                  ? "Szkic"
                                  : protocol.status === "completed"
                                    ? "Ukończony"
                                    : "Podpisany"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                              <div>
                                <span className="font-medium">Klient:</span> {protocol.clientName}
                              </div>
                              <div>
                                <span className="font-medium">Data:</span> {formatProtocolDate(protocol.date)}
                              </div>
                              <div>
                                <span className="font-medium">Lokalizacja:</span> {protocol.location}
                              </div>
                              <div>
                                <span className="font-medium">Typ:</span>{" "}
                                {protocol.installationType === "nowa"
                                  ? "Nowa instalacja"
                                  : protocol.installationType === "modernizacja"
                                    ? "Modernizacja"
                                    : protocol.installationType === "naprawa"
                                      ? "Naprawa"
                                      : "Przegląd"}
                              </div>
                            </div>

                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span>{passedCount} OK</span>
                              </div>
                              {warningCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                  <span>{warningCount} ostrzeżeń</span>
                                </div>
                              )}
                              {failedCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                  <span>{failedCount} błędów</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 font-medium"
                              disabled={isGeneratingInvoice === protocol.id}
                              onClick={() => handleCreateInvoiceFromProtocol(protocol)}
                              title="Wystaw fakturę na podstawie pomiarów"
                            >
                              <Receipt className="h-3.5 w-3.5 mr-1" />
                              Faktura
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProtocol(protocol);
                                setShowForm(true);
                              }}
                              title="Edytuj protokół"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(protocol)}
                              title="Pobierz protokół PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleExportExcel(protocol)}
                              title="Eksportuj protokół do Excela (.xlsx)"
                            >
                              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProtocol(protocol.id)}
                              title="Usuń protokół"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
