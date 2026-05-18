"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, startOfDay, endOfDay, isSameDay, differenceInDays, addHours } from "date-fns";
import { pl } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useScheduleStore } from "@/store/schedule-store";
import { SCHEDULE_TYPE_LABELS, SCHEDULE_STATUS_LABELS, RECURRENCE_LABELS, type ScheduleEvent, type ScheduleStatus, type RecurrencePattern } from "@/types";
import { scheduleEventSchema } from "@/lib/validators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Calendar as CalendarIcon, Phone, MapPin, AlertCircle, Clock, CheckCircle2, ListTodo, BarChart3, Copy, Download, Bell, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { motion, AnimatePresence } from "framer-motion";
import { BoltRow, PipeProgress, HydraulicBadge } from "@/components/hydraulic-decorations";
import { exportToCSV, exportToICalendar, getClientEvents, getClientEventStats } from "@/lib/schedule-utils";

const locales = { pl };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const TYPE_COLORS: Record<ScheduleEvent["type"], string> = {
  wycena: "#3b82f6",
  realizacja: "#10b981",
  przeglad: "#8b5cf6",
  awaria: "#ef4444",
  inne: "#6b7280",
};

const STATUS_COLORS: Record<ScheduleStatus, string> = {
  zaplanowane: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  w_trakcie: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  zakonczone: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  anulowane: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const EMPTY_FORM = {
  clientName: "",
  clientPhone: "",
  title: "",
  description: "",
  address: "",
  startTime: "",
  endTime: "",
  type: "wycena" as ScheduleEvent["type"],
  status: "zaplanowane" as ScheduleStatus,
  color: "",
  recurrence: "none" as RecurrencePattern,
  recurrenceEndDate: "",
  remindersEnabled: true,
  reminders: [30, 60], // 30 min i 1h przed
};

export default function HarmonogramPage() {
  const events = useScheduleStore((s) => s.events);
  const loading = useScheduleStore((s) => s.loading);
  const search = useScheduleStore((s) => s.search);
  const typeFilter = useScheduleStore((s) => s.typeFilter);
  const statusFilter = useScheduleStore((s) => s.statusFilter);
  const setSearch = useScheduleStore((s) => s.setSearch);
  const setTypeFilter = useScheduleStore((s) => s.setTypeFilter);
  const setStatusFilter = useScheduleStore((s) => s.setStatusFilter);
  const add = useScheduleStore((s) => s.add);
  const update = useScheduleStore((s) => s.update);
  const remove = useScheduleStore((s) => s.remove);
  const changeStatus = useScheduleStore((s) => s.changeStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [events, search, typeFilter, statusFilter]);

  // Statystyki
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 7);
    const monthEnd = addDays(today, 30);

    const todayEvents = events.filter((e) => isSameDay(new Date(e.startTime), today));
    const tomorrowEvents = events.filter((e) => isSameDay(new Date(e.startTime), tomorrow));
    const weekEvents = events.filter((e) => {
      const d = new Date(e.startTime);
      return d >= today && d < weekEnd;
    });
    const monthEvents = events.filter((e) => {
      const d = new Date(e.startTime);
      return d >= today && d < monthEnd;
    });
    const completedToday = todayEvents.filter((e) => e.status === "zakonczone").length;
    const inProgressToday = todayEvents.filter((e) => e.status === "w_trakcie").length;

    return {
      todayCount: todayEvents.length,
      tomorrowCount: tomorrowEvents.length,
      weekCount: weekEvents.length,
      monthCount: monthEvents.length,
      completedToday,
      inProgressToday,
      completionRate: todayEvents.length > 0 ? Math.round((completedToday / todayEvents.length) * 100) : 0,
    };
  }, [events]);

  // Agenda (dzisiejsze i jutrzejsze zdarzenia)
  const agendaEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const tomorrowEnd = addDays(tomorrow, 1);
    return events
      .filter((e) => {
        const d = new Date(e.startTime);
        return d >= today && d < tomorrowEnd;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events]);

  // Bulk actions
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function bulkChangeStatus(status: ScheduleStatus) {
    selectedIds.forEach((id) => changeStatus(id, status));
    toast.success(`Status zmieniony dla ${selectedIds.size} zdarzeń`);
    setSelectedIds(new Set());
  }

  function bulkDelete() {
    selectedIds.forEach((id) => remove(id));
    toast.success(`Usunięto ${selectedIds.size} zdarzeń`);
    setSelectedIds(new Set());
  }

  function bulkDuplicate() {
    selectedIds.forEach((id) => {
      const e = events.find((x) => x.id === id);
      if (e) {
        const newStart = addDays(new Date(e.startTime), 1);
        const newEnd = addDays(new Date(e.endTime), 1);
        add({
          clientName: e.clientName,
          clientPhone: e.clientPhone,
          title: e.title,
          description: e.description,
          address: e.address,
          startTime: newStart,
          endTime: newEnd,
          type: e.type,
          status: "zaplanowane",
          color: e.color,
        });
      }
    });
    toast.success(`Zduplikowano ${selectedIds.size} zdarzeń na jutro`);
    setSelectedIds(new Set());
  }

  function handleExportCSV() {
    const csv = exportToCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `harmonogram-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Harmonogram wyeksportowany do CSV");
  }

  function handleExportICalendar() {
    const ics = exportToICalendar(filtered);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `harmonogram-${format(new Date(), "yyyy-MM-dd")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Harmonogram wyeksportowany do iCalendar");
  }

  const calendarEvents = useMemo(() => {
    return filtered.map((e) => ({
      id: e.id,
      title: `${e.title} - ${e.clientName}`,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      resource: e,
    }));
  }, [filtered]);

  function validateForm(): boolean {
    const result = scheduleEventSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (path) {
          fieldErrors[path] = issue.message;
        }
      });

      if (form.startTime && form.endTime) {
        const start = new Date(form.startTime);
        const end = new Date(form.endTime);
        if (end <= start) {
          fieldErrors.endTime = "Czas zakończenia musi być późniejszy niż rozpoczęcia";
        }
      }

      if (form.startTime) {
        const start = new Date(form.startTime);
        if (isNaN(start.getTime())) {
          fieldErrors.startTime = "Nieprawidłowy format daty";
        }
      }

      if (form.endTime) {
        const end = new Date(form.endTime);
        if (isNaN(end.getTime())) {
          fieldErrors.endTime = "Nieprawidłowy format daty";
        }
      }

      if (form.clientPhone) {
        const phoneRegex = /^[\+]?[\d\s\-]{7,15}$/;
        if (!phoneRegex.test(form.clientPhone)) {
          fieldErrors.clientPhone = "Nieprawidłowy format numeru telefonu";
        }
      }

      setErrors(fieldErrors);
      setTouchedFields({
        title: true,
        clientName: true,
        startTime: true,
        endTime: true,
        type: true,
        status: true,
        clientPhone: form.clientPhone ? true : false,
      });
      return false;
    }

    if (form.startTime && form.endTime) {
      const start = new Date(form.startTime);
      const end = new Date(form.endTime);
      if (end <= start) {
        setErrors((prev) => ({ ...prev, endTime: "Czas zakończenia musi być później niż rozpoczęcia" }));
        return false;
      }
    }

    setErrors({});
    return true;
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setTouchedFields({});
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    const e = events.find((x) => x.id === id);
    if (!e) return;
    setEditingId(id);
    const toLocalISOString = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };
    setForm({
      clientName: e.clientName,
      clientPhone: e.clientPhone || "",
      title: e.title,
      description: e.description || "",
      address: e.address || "",
      startTime: toLocalISOString(new Date(e.startTime)),
      endTime: toLocalISOString(new Date(e.endTime)),
      type: e.type,
      status: e.status,
      color: e.color || "",
      recurrence: e.recurrence || "none",
      recurrenceEndDate: e.recurrenceEndDate ? toLocalISOString(new Date(e.recurrenceEndDate)) : "",
      remindersEnabled: e.remindersEnabled ?? true,
      reminders: e.reminders || [30, 60],
    });
    setErrors({});
    setTouchedFields({});
    setDialogOpen(true);
  }

  function handleSave() {
    if (!validateForm()) {
      toast.error("Popraw błędy w formularzu");
      return;
    }
    const data = {
      clientName: form.clientName,
      clientPhone: form.clientPhone || undefined,
      title: form.title,
      description: form.description || undefined,
      address: form.address || undefined,
      startTime: new Date(form.startTime),
      endTime: new Date(form.endTime),
      type: form.type,
      status: form.status,
      color: form.color || undefined,
      recurrence: form.recurrence as RecurrencePattern,
      recurrenceEndDate: form.recurrenceEndDate ? new Date(form.recurrenceEndDate) : undefined,
      remindersEnabled: form.remindersEnabled,
      reminders: form.reminders,
    };
    if (editingId) {
      update(editingId, data);
      toast.success("Zdarzenie zaktualizowane");
    } else {
      add(data);
      toast.success("Zdarzenie dodane");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Zdarzenie usunięte");
  }

  function handleStatusChange(id: number, status: ScheduleStatus) {
    changeStatus(id, status);
    toast.success(`Status zmieniony na: ${SCHEDULE_STATUS_LABELS[status]}`);
  }

  function handleFieldChange(field: string, value: string | null) {
    if (value === null) return;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touchedFields[field]) {
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
      const testForm = { ...form, [field]: value };
      const result = scheduleEventSchema.safeParse(testForm);
      setErrors((prev) => {
        const next = { ...prev };
        if (result.success) {
          delete next[field];
        } else {
          const fieldError = result.error.issues.find((i) => i.path[0] === field);
          if (fieldError) {
            next[field] = fieldError.message;
          } else {
            delete next[field];
          }
        }
        return next;
      });
    }
  }

  function handleBlur(field: string) {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    const value = (form as Record<string, unknown>)[field] as string;
    if (field === 'clientPhone' && value) {
      const phoneRegex = /^[\+]?[\d\s\-]{7,15}$/;
      if (!phoneRegex.test(value)) {
        setErrors((prev) => ({ ...prev, clientPhone: "Nieprawidłowy format numeru telefonu" }));
        return;
      }
    }
    const testForm = { ...form };
    const result = scheduleEventSchema.safeParse(testForm);
    if (!result.success) {
      const fieldError = result.error.issues.find((i) => i.path[0] === field);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      }
    }
  }

  const getInputClassName = (field: string) => {
    if (!touchedFields[field]) return "";
    if (errors[field]) return "border-destructive focus-visible:ring-destructive";
    return "border-green-500 focus-visible:ring-green-500";
  };

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <motion.h1
                className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Harmonogram
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Kalendarz zleceń i wydarzeń</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-secondary h-9 text-xs"
                  onClick={async () => {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                      toast.success("Powiadomienia włączone");
                    }
                  }}
                >
                  <Bell className="h-3.5 w-3.5 mr-1" />
                  Włącz powiadomienia
                </Button>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                  <Plus className="h-4 w-4" />
                  Dodaj wydarzenie
                </Button>
              </motion.div>
            </div>
          </div>
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="card-steel"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Dzisiaj</div>
              <div className="text-xl font-black">{stats.todayCount}</div>
              <div className="text-[10px] text-muted-foreground">{stats.completedToday} ukończonych</div>
            </CardContent></Card>
            <Card className="card-gauge"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Jutro</div>
              <div className="text-xl font-black">{stats.tomorrowCount}</div>
              <PipeProgress percent={Math.min(100, stats.tomorrowCount * 20)} className="mt-1" />
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Ten tydzień</div>
              <div className="text-xl font-black">{stats.weekCount}</div>
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Ten miesiąc</div>
              <div className="text-xl font-black">{stats.monthCount}</div>
            </CardContent></Card>
            <Card className="card-gauge"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Ukończenie dzisiaj</div>
              <div className="text-xl font-black">{stats.completionRate}%</div>
              <PipeProgress percent={stats.completionRate} className="mt-1" />
            </CardContent></Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                  <div className="relative flex-1">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Szukaj wydarzeń..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
                    <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie typy</SelectItem>
                      {Object.entries(SCHEDULE_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                    <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie statusy</SelectItem>
                      {Object.entries(SCHEDULE_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Select onValueChange={(v) => { if (v === "csv") handleExportCSV(); else if (v === "ics") handleExportICalendar(); }}>
                    <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Eksport" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="ics">iCalendar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "agenda")} className="shrink-0">
                    <TabsList>
                      <TabsTrigger value="calendar">Kalendarz</TabsTrigger>
                      <TabsTrigger value="agenda">Agenda</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Bulk actions bar */}
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-primary/5 border border-primary/20 flex-wrap"
                >
                  <span className="text-sm font-medium text-primary">Zaznaczono: {selectedIds.size}</span>
                  <div className="flex gap-2 flex-wrap">
                    <Select onValueChange={(v) => bulkChangeStatus(v as ScheduleStatus)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Zmień status" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCHEDULE_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={bulkDuplicate}>
                      <Copy className="h-3 w-3 mr-1" />Duplikuj
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button variant="outline" size="sm" className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3 mr-1" />Usuń
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usuń zaznaczone zdarzenia</AlertDialogTitle>
                          <AlertDialogDescription>Czy na pewno chcesz usunąć {selectedIds.size} zdarzeń?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-white hover:bg-destructive/90">Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
                      Odznacz
                    </Button>
                  </div>
                </motion.div>
              )}

              {loading ? (
                <div className="text-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" /></div>
              ) : viewMode === "calendar" ? (
                filtered.length === 0 ? (
                  <AnimatedEmptyState
                    icon={CalendarIcon}
                    title={events.length === 0 ? "Brak wydarzeń" : "Brak wyników"}
                    description={events.length === 0 ? "Dodaj pierwsze wydarzenie do harmonogramu" : "Spróbuj zmienić kryteria wyszukiwania"}
                    action={events.length === 0 ? (
                      <Button className="btn-primary" onClick={openAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj wydarzenie
                      </Button>
                    ) : undefined}
                  />
                ) : (
                  <div className="min-h-[600px]">
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: 600 }}
                      culture="pl"
                      messages={{
                        next: "Następny",
                        previous: "Poprzedni",
                        today: "Dziś",
                        month: "Miesiąc",
                        week: "Tydzień",
                        day: "Dzień",
                        agenda: "Agenda",
                        date: "Data",
                        time: "Czas",
                        event: "Wydarzenie",
                        noEventsInRange: "Brak wydarzeń w tym okresie",
                        showMore: (total) => `+ ${total} więcej`,
                      }}
                      eventPropGetter={(event) => {
                        const resource = event.resource as ScheduleEvent;
                        const color = resource.color || TYPE_COLORS[resource.type] || "#3b82f6";
                        return {
                          style: {
                            backgroundColor: color,
                            borderColor: color,
                            borderRadius: "8px",
                            padding: "4px 8px",
                            fontSize: "12px",
                          },
                        };
                      }}
                      onSelectEvent={(event) => {
                        const resource = event.resource as ScheduleEvent;
                        if (resource.id) openEdit(resource.id);
                      }}
                    />
                  </div>
                )
              ) : (
                // Agenda view
                agendaEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Brak zdarzeń dzisiaj i jutro</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {agendaEvents.map((event, idx) => {
                        const isToday = isSameDay(new Date(event.startTime), startOfDay(new Date()));
                        const startHour = format(new Date(event.startTime), "HH:mm");
                        const endHour = format(new Date(event.endTime), "HH:mm");
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => event.id && openEdit(event.id)}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 rounded border-border"
                              checked={selectedIds.has(event.id!)}
                              onChange={() => toggleSelect(event.id!)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div
                              className="h-12 w-1 rounded-full shrink-0"
                              style={{ backgroundColor: event.color || TYPE_COLORS[event.type] }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm">{event.title}</h4>
                                <HydraulicBadge>{SCHEDULE_TYPE_LABELS[event.type]}</HydraulicBadge>
                                <Badge className={`text-[10px] ${STATUS_COLORS[event.status]}`}>{SCHEDULE_STATUS_LABELS[event.status]}</Badge>
                                {isToday && <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40">Dzisiaj</Badge>}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {startHour} - {endHour}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span className="font-medium">{event.clientName}</span>
                                {event.clientPhone && <a href={`tel:${event.clientPhone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{event.clientPhone}</a>}
                                {event.clientId && (
                                  <a href={`/klienci/${event.clientId}`} className="flex items-center gap-1 hover:text-primary text-blue-600 dark:text-blue-400">
                                    <LinkIcon className="h-3 w-3" />Profil
                                  </a>
                                )}
                              </div>
                              {event.address && <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{event.address}</div>}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); event.id && openEdit(event.id); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Legenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Object.entries(SCHEDULE_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[key as ScheduleEvent["type"]] }} />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj wydarzenie" : "Nowe wydarzenie"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Tytuł <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                onBlur={() => handleBlur("title")}
                className={getInputClassName("title")}
                placeholder="np. Wycena u klienta"
              />
              {errors.title && (
                <p className="text-destructive text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">
                  Klient <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientName"
                  value={form.clientName}
                  onChange={(e) => handleFieldChange("clientName", e.target.value)}
                  onBlur={() => handleBlur("clientName")}
                  className={getInputClassName("clientName")}
                  placeholder="Imię i nazwisko / Firma"
                />
                {errors.clientName && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.clientName}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clientPhone">Telefon</Label>
                <Input
                  id="clientPhone"
                  value={form.clientPhone}
                  onChange={(e) => handleFieldChange("clientPhone", e.target.value)}
                  onBlur={() => handleBlur("clientPhone")}
                  className={getInputClassName("clientPhone")}
                  placeholder="+48 123 456 789"
                />
                {errors.clientPhone && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.clientPhone}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">
                  Rozpoczęcie <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => handleFieldChange("startTime", e.target.value)}
                  onBlur={() => handleBlur("startTime")}
                  className={getInputClassName("startTime")}
                />
                {errors.startTime && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.startTime}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">
                  Zakończenie <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => handleFieldChange("endTime", e.target.value)}
                  onBlur={() => handleBlur("endTime")}
                  className={getInputClassName("endTime")}
                />
                {errors.endTime && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.endTime}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>
                  Typ <span className="text-destructive">*</span>
                </Label>
                <Select value={form.type} onValueChange={(v) => v && handleFieldChange("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select value={form.status} onValueChange={(v) => v && handleFieldChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Powtarzanie</Label>
                <Select value={form.recurrence} onValueChange={(v) => v && handleFieldChange("recurrence", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {form.recurrence !== "none" && (
                <div className="grid gap-2">
                  <Label htmlFor="recurrenceEndDate">Koniec powtarzania</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={form.recurrenceEndDate}
                    onChange={(e) => handleFieldChange("recurrenceEndDate", e.target.value)}
                    placeholder="Opcjonalnie"
                  />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remindersEnabled"
                  checked={form.remindersEnabled}
                  onChange={(e) => setForm({ ...form, remindersEnabled: e.target.checked })}
                  className="rounded border-border"
                />
                <Label htmlFor="remindersEnabled" className="flex items-center gap-2 cursor-pointer">
                  <Bell className="h-4 w-4" />
                  Włącz przypomnienia
                </Label>
              </div>
              {form.remindersEnabled && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                  <div>Przypomnienia: {form.reminders?.join(", ")} minut przed zdarzeniem</div>
                  <div className="text-[10px]">✓ Powiadomienie systemowe (dźwięk + toast)</div>
                  <div className="text-[10px]">✓ Email reminder</div>
                  <div className="text-[10px]">✓ SMS reminder</div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Adres
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => handleFieldChange("address", e.target.value)}
                placeholder="ul. Przykładowa 1, 00-000 Miasto"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Opis</Label>
              <Input
                id="desc"
                value={form.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                placeholder="Dodatkowe informacje..."
              />
            </div>
          </div>
          <DialogFooter>
            {editingId && (
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button variant="destructive" size="sm" data-testid="delete-event-button">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usuń wydarzenie</AlertDialogTitle>
                    <AlertDialogDescription>Czy na pewno chcesz usunąć to wydarzenie?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { handleDelete(editingId); setDialogOpen(false); }}>Usuń</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <DialogClose>
              <Button variant="outline">Anuluj</Button>
            </DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj wydarzenie"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
