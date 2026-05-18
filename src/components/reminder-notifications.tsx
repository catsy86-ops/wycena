"use client";

import { useEffect, useState } from "react";
import { useScheduleStore } from "@/store/schedule-store";
import { shouldShowReminder, sendSystemNotification, sendEmailReminder, sendSMSReminder } from "@/lib/schedule-utils";
import { ScheduleEvent } from "@/types";
import { toast } from "sonner";
import { Bell } from "lucide-react";

/**
 * Komponent do wysyłania przypomnień o zdarzeniach
 * Sprawdza co minutę czy powinno być wysłane przypomnienie
 */
export function ReminderNotifications() {
  const events = useScheduleStore((s) => s.events);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // Sprawdzenie czy powiadomienia są dostępne (bez żądania uprawnień)
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationEnabled(Notification.permission === "granted");
    }
  }, []);

  // Sprawdzanie przypomnień co minutę
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();

      for (const event of events) {
        if (!event.remindersEnabled || !event.reminders) continue;

        for (const minutesBefore of event.reminders) {
          const reminderId = `${event.id}-${minutesBefore}`;

          // Sprawdź czy już wysłano to przypomnienie
          if (sentReminders.has(reminderId)) continue;

          // Sprawdź czy powinno być wysłane przypomnienie
          if (shouldShowReminder(event, minutesBefore)) {
            // Oznacz jako wysłane
            setSentReminders((prev) => new Set(prev).add(reminderId));

            // 1. Powiadomienie systemowe
            if (notificationEnabled) {
              sendSystemNotification(event, minutesBefore);
            }

            // 2. Toast notification
            toast.info(
              `Przypomnienie: ${event.title} za ${minutesBefore} minut`,
              {
                icon: <Bell className="h-4 w-4" />,
                duration: 10000,
              }
            );

            // 3. Email reminder (async, bez czekania)
            sendEmailReminder(event, minutesBefore).catch((e) =>
              console.error("Email reminder failed:", e)
            );

            // 4. SMS reminder (async, bez czekania)
            sendSMSReminder(event, minutesBefore).catch((e) =>
              console.error("SMS reminder failed:", e)
            );

            console.log(`[REMINDER] Sent for event: ${event.title}`);
          }
        }
      }
    }, 60000); // Sprawdzaj co minutę

    return () => clearInterval(interval);
  }, [events, sentReminders, notificationEnabled]);

  // Resetuj wysłane przypomnienia gdy zmienią się zdarzenia
  useEffect(() => {
    setSentReminders(new Set());
  }, [events.length]);

  return null; // Komponent nie renderuje nic
}
