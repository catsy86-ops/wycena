"use client";

import { useState, useMemo } from "react";
import { MeasurementProtocol } from "@/lib/electrical-protocols";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, Search, Download, Eye, Trash2, Edit2,
  CheckCircle2, AlertTriangle, AlertCircle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";
import { ElectricalProtocolForm } from "@/components/electrical-protocol-form";
import { downloadProtocolPDF } from "@/lib/protocol-pdf";
import { formatProtocolDate } from "@/lib/electrical-protocols";
import Link from "next/link";

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
  const [protocols, setProtocols] = useState<MeasurementProtocol[]>(MOCK_PROTOCOLS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "completed" | "signed">("all");
  const [selectedProtocol, setSelectedProtocol] = useState<MeasurementProtocol | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const handleSaveProtocol = (protocol: MeasurementProtocol) => {
    if (selectedProtocol) {
      setProtocols((prev) =>
        prev.map((p) => (p.id === protocol.id ? protocol : p))
      );
      toast.success("Protokół zaktualizowany");
    } else {
      setProtocols((prev) => [...prev, protocol]);
      toast.success("Protokół utworzony");
    }
    setShowForm(false);
    setSelectedProtocol(null);
  };

  const handleDeleteProtocol = (id: string) => {
    setProtocols((prev) => prev.filter((p) => p.id !== id));
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
      toast.error("Błąd podczas generowania PDF");
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
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">Brak protokołów spełniających kryteria wyszukiwania</p>
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

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProtocol(protocol);
                                setShowForm(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(protocol)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProtocol(protocol.id)}
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
