"use client";

import { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { STATUS_LABELS } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Calendar, TrendingUp, Building2, Tag, Plus, ExternalLink, Mail as MailIcon, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  szkic: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wyslana: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  zaakceptowana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  odrzucona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const TAG_COLORS = ["bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300", "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300"];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ["from-blue-500 to-indigo-600", "from-violet-500 to-purple-600", "from-emerald-500 to-green-600", "from-amber-500 to-orange-600", "from-pink-500 to-rose-600", "from-cyan-500 to-teal-600"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const clients = useClientStore((s) => s.clients);
  const quotes = useQuoteStore((s) => s.quotes);

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id]);
  const clientQuotes = useMemo(() => quotes.filter((q) => q.clientId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [quotes, id]);

  const stats = useMemo(() => {
    const totalQuotes = clientQuotes.length;
    const acceptedQuotes = clientQuotes.filter((q) => q.status === "zaakceptowana");
    const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + q.totalBrutto, 0);
    const pendingQuotes = clientQuotes.filter((q) => q.status === "wyslana" || q.status === "szkic");
    const avgQuoteValue = acceptedQuotes.length > 0 ? totalRevenue / acceptedQuotes.length : 0;
    const lastQuoteDate = clientQuotes.length > 0 ? new Date(clientQuotes[0].createdAt) : null;
    return { totalQuotes, acceptedQuotes: acceptedQuotes.length, pendingQuotes: pendingQuotes.length, totalRevenue, avgQuoteValue, lastQuoteDate };
  }, [clientQuotes]);

  if (!client) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-muted-foreground">Klient nie znaleziony</p>
          <Button variant="outline" onClick={() => router.push("/klienci")}>Wróć do listy</Button>
        </div>
      </PageTransition>
    );
  }

  const tags = (client as any).tags ? (client as any).tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6 max-w-5xl mx-auto">
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="btn-ghost" onClick={() => router.push("/klienci")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(client.name)} text-white text-lg font-bold shrink-0`}>
                {getInitials(client.name)}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{client.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {tags.length > 0 && tags.map((tag: string, i: number) => (
                    <Badge key={i} className={`text-xs px-2 py-0.5 ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                      <Tag className="h-3 w-3 mr-1" />{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <a href={`tel:${client.phone}`}>
                <Button variant="outline" className="btn-secondary w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  <span className="hidden sm:inline">Zadzwoń</span>
                </Button>
              </a>
              {client.email && (
                <a href={`mailto:${client.email}`}>
                  <Button variant="outline" className="btn-secondary w-full sm:w-auto">
                    <MailIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </Button>
                </a>
              )}
              <Link href={`/wyceny/nowa`}>
                <Button className="btn-primary w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Nowa wycena
                </Button>
              </Link>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-modern">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold">{stats.totalQuotes}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Wyceny</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold">{stats.acceptedQuotes}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Zaakceptowane</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 shrink-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold">{stats.lastQuoteDate ? format(stats.lastQuoteDate, "dd.MM.yyyy", { locale: pl }) : "-"}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Ostatnia wycena</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-bold">{stats.totalRevenue > 0 ? formatCurrency(stats.totalRevenue) : "-"}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Przychód</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-modern">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Dane kontaktowe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                  <a href={`tel:${client.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{client.phone}</a>
                </div>
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0" />
                    <a href={`mailto:${client.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{client.email}</a>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="text-muted-foreground">{client.address}</span>
                  </div>
                )}
                {client.nip && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="font-mono">NIP: {client.nip}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {(client as any).notes && (
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Notatki</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(client as any).notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" />Historia wycen</CardTitle>
              <CardDescription>{clientQuotes.length} wycen</CardDescription>
            </CardHeader>
            <CardContent>
              {clientQuotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Brak wycen dla tego klienta</p>
                  <Link href={`/wyceny/nowa`}>
                    <Button className="btn-primary mt-3">
                      <Plus className="h-4 w-4 mr-2" />
                      Utwórz pierwszą wycenę
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numer</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Brutto</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientQuotes.map((q) => (
                        <TableRow key={q.id} className="cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/wyceny/${q.id}`)}>
                          <TableCell className="font-semibold">{q.number}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(q.totalNetto)}</TableCell>
                          <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(q.totalBrutto)}</TableCell>
                          <TableCell>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
