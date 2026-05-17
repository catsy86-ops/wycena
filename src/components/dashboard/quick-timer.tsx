"use client";

import { useState } from "react";
import { useTimeStore } from "@/store/time-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

/**
 * Szybki start timera bezpośrednio z pulpitu.
 * Minimalistyczny — tylko opis i przycisk Start.
 */
export function QuickTimer() {
  const activeTimer = useTimeStore((s) => s.activeTimer);
  const startTimer = useTimeStore((s) => s.startTimer);
  const stopTimer = useTimeStore((s) => s.stopTimer);
  const [desc, setDesc] = useState("");

  if (activeTimer) return null; // ActiveTimerBar jest widoczny

  function handleStart() {
    if (!desc.trim()) {
      toast.error("Wpisz co robisz");
      return;
    }
    startTimer({ clientName: "—", description: desc.trim(), hourlyRate: 120, category: "robocizna" });
    toast.success("Timer uruchomiony");
    setDesc("");
  }

  return (
    <Card className="card-modern">
      <CardContent className="pt-3 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Co robisz? (Enter = start)"
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button size="sm" className="btn-primary h-8 px-3" onClick={handleStart}>
              <Play className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
