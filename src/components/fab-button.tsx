"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Users, Clock, X } from "lucide-react";
import { useTimeStore } from "@/store/time-store";

const ACTIONS = [
  { icon: FileText, label: "Nowa wycena", href: "/wyceny/nowa", color: "oklch(0.52 0.19 220)" },
  { icon: Users, label: "Nowy klient", href: "/klienci", color: "oklch(0.55 0.18 155)" },
  { icon: Clock, label: "Start timer", href: null, color: "oklch(0.65 0.18 85)" },
];

export function FabButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const activeTimer = useTimeStore((s) => s.activeTimer);

  // Nie pokazuj FAB gdy timer jest aktywny (ActiveTimerBar jest widoczny)
  if (activeTimer) return null;

  function handleAction(action: typeof ACTIONS[0]) {
    setOpen(false);
    if (action.href) {
      router.push(action.href);
    } else {
      // Start timer — przejdź do strony czasu
      router.push("/czas");
    }
  }

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 text-white text-sm font-medium shadow-lg"
                  style={{ background: action.color }}
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleAction(action)}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-xl"
        style={{
          background: "linear-gradient(135deg, oklch(0.52 0.19 220), oklch(0.44 0.20 230))",
          boxShadow: "0 4px 20px oklch(0.52 0.19 220 / 0.4)",
        }}
        onClick={() => setOpen(!open)}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Szybkie akcje"
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
      </motion.button>
    </div>
  );
}
