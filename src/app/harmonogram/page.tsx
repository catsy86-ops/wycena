"use client";

import { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { pl } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useScheduleStore } from "@/store/schedule-store";
import { SCHEDULE_TYPE_LABELS, SCHEDULE_STATUS_LABELS, type ScheduleEvent, type ScheduleStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Calendar as CalendarIcon, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { motion, AnimatePresence } from "framer-motion";

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

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [events, search, typeFilter, statusFilter]);

  const calendarEvents = useMemo(() => {
    return filtered.map((e) => ({
      id: e.id,
      title: `${e.title} - ${e.clientName}`,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      resource: e,
    }));
  }, [filtered]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
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
    });
    setErrors({});
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title || !form.clientName || !form.startTime || !form.endTime) {
      toast.error("Wypełnij wymagane pola");
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
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Dodaj wydarzenie
              </Button>
            </motion.div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
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
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" /></div>
              ) : filtered.length === 0 ? (
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
              <Label htmlFor="title">Tytuł</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {errors.title && <p className="text-destructive text-xs">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Klient</Label>
                <Input id="clientName" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clientPhone">Telefon</Label>
                <Input id="clientPhone" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Rozpoczęcie</Label>
                <Input id="startTime" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Zakończenie</Label>
                <Input id="endTime" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Typ</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ScheduleEvent["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ScheduleStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Adres</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Opis</Label>
              <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zapisz zmiany" : "Dodaj wydarzenie"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
