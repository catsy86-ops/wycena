import { ScheduleEvent } from "@/types";
import { format, differenceInMinutes } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * Sprawdza czy powinno być wysłane przypomnienie dla zdarzenia
 */
export function shouldShowReminder(event: ScheduleEvent, minutesBefore: number): boolean {
  if (!event.remindersEnabled) return false;
  const now = new Date();
  const eventTime = new Date(event.startTime);
  const minutesUntilEvent = differenceInMinutes(eventTime, now);
  
  // Pokaż reminder w oknie 1 minuty przed czasem przypomnienia
  return minutesUntilEvent <= minutesBefore && minutesUntilEvent > minutesBefore - 1;
}

/**
 * Wysyła powiadomienie systemowe (toast + dźwięk)
 */
export function sendSystemNotification(event: ScheduleEvent, minutesBefore: number) {
  const title = `Przypomnienie: ${event.title}`;
  const options: NotificationOptions = {
    body: `${event.clientName} za ${minutesBefore} minut`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: `reminder-${event.id}`,
    requireInteraction: false,
  };

  // Powiadomienie systemowe (jeśli dostępne i uprawnienia udzielone)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, options);
    } catch (e) {
      console.error("Notification failed:", e);
    }
  }

  // Dźwięk
  playNotificationSound();
}

/**
 * Odtwarza dźwięk powiadomienia
 */
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Dwa tony (beep-beep)
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);

    // Drugi ton
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.1);
    }, 150);
  } catch (e) {
    console.log("Audio notification not available");
  }
}

/**
 * Wysyła email reminder (mock - w produkcji użyć API)
 */
export async function sendEmailReminder(event: ScheduleEvent, minutesBefore: number): Promise<boolean> {
  try {
    const response = await fetch("/api/reminders/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        title: event.title,
        clientName: event.clientName,
        clientEmail: event.clientPhone, // Placeholder - w rzeczywistości byłby email
        startTime: event.startTime,
        minutesBefore,
        address: event.address,
      }),
    });
    return response.ok;
  } catch (e) {
    console.error("Email reminder failed:", e);
    return false;
  }
}

/**
 * Wysyła SMS reminder (mock - w produkcji użyć API)
 */
export async function sendSMSReminder(event: ScheduleEvent, minutesBefore: number): Promise<boolean> {
  try {
    const response = await fetch("/api/reminders/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        title: event.title,
        clientName: event.clientName,
        clientPhone: event.clientPhone,
        startTime: event.startTime,
        minutesBefore,
      }),
    });
    return response.ok;
  } catch (e) {
    console.error("SMS reminder failed:", e);
    return false;
  }
}

/**
 * Eksportuje zdarzenia do formatu CSV
 */
export function exportToCSV(events: ScheduleEvent[]): string {
  const headers = ["Data", "Godzina", "Tytuł", "Klient", "Telefon", "Typ", "Status", "Adres", "Opis"];
  const rows = events.map((e) => [
    format(new Date(e.startTime), "dd.MM.yyyy", { locale: pl }),
    format(new Date(e.startTime), "HH:mm", { locale: pl }),
    e.title,
    e.clientName,
    e.clientPhone || "",
    e.type,
    e.status,
    e.address || "",
    e.description || "",
  ]);
  
  const csvContent = [
    headers.join(";"),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
  ].join("\n");
  
  return "\uFEFF" + csvContent;
}

/**
 * Eksportuje zdarzenia do formatu iCalendar (.ics)
 */
export function exportToICalendar(events: ScheduleEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WYCENKA//Schedule//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Harmonogram WYCENKA",
    "X-WR-TIMEZONE:Europe/Warsaw",
  ];

  events.forEach((e) => {
    const startTime = new Date(e.startTime);
    const endTime = new Date(e.endTime);
    const dtStart = formatICalDate(startTime);
    const dtEnd = formatICalDate(endTime);
    const uid = `${e.id}-${e.clientName.replace(/\s/g, "-")}@wycenka.local`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICalText(e.title)} - ${escapeICalText(e.clientName)}`);
    lines.push(`DESCRIPTION:${escapeICalText(e.description || "")}`);
    lines.push(`LOCATION:${escapeICalText(e.address || "")}`);
    lines.push(`CATEGORIES:${e.type}`);
    lines.push(`STATUS:${e.status === "zakonczone" ? "COMPLETED" : "CONFIRMED"}`);
    
    // Dodaj przypomnienia
    if (e.remindersEnabled && e.reminders && e.reminders.length > 0) {
      e.reminders.forEach((minutes) => {
        lines.push("BEGIN:VALARM");
        lines.push("TRIGGER:-PT" + minutes + "M");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:Przypomnienie: ${e.title}`);
        lines.push("END:VALARM");
      });
    }

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Formatuje datę do formatu iCalendar (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapuje tekst dla formatu iCalendar
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Pobiera zdarzenia dla klienta
 */
export function getClientEvents(events: ScheduleEvent[], clientId: number): ScheduleEvent[] {
  return events.filter((e) => e.clientId === clientId).sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

/**
 * Pobiera statystyki dla klienta
 */
export function getClientEventStats(events: ScheduleEvent[], clientId: number) {
  const clientEvents = getClientEvents(events, clientId);
  const completed = clientEvents.filter((e) => e.status === "zakonczone").length;
  const inProgress = clientEvents.filter((e) => e.status === "w_trakcie").length;
  const planned = clientEvents.filter((e) => e.status === "zaplanowane").length;
  
  return {
    total: clientEvents.length,
    completed,
    inProgress,
    planned,
    completionRate: clientEvents.length > 0 ? Math.round((completed / clientEvents.length) * 100) : 0,
  };
}
