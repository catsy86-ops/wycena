"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const THEMES = [
  { id: "blue", label: "Niebieski", hue: 220, chroma: 0.19 },
  { id: "cyan", label: "Cyjan", hue: 195, chroma: 0.17 },
  { id: "green", label: "Zielony", hue: 155, chroma: 0.18 },
  { id: "violet", label: "Fioletowy", hue: 280, chroma: 0.20 },
  { id: "orange", label: "Pomarańczowy", hue: 45, chroma: 0.18 },
  { id: "pink", label: "Różowy", hue: 330, chroma: 0.20 },
] as const;

const STORAGE_KEY = "wycenka_accent_theme";

export function ThemePicker() {
  const [activeTheme, setActiveTheme] = useState("blue");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setActiveTheme(saved);
      applyTheme(saved);
    }
  }, []);

  function applyTheme(themeId: string) {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty("--theme-hue", String(theme.hue));
    root.style.setProperty("--theme-chroma", String(theme.chroma));
    // Update CSS custom properties for primary color
    root.style.setProperty("--primary", `oklch(0.52 ${theme.chroma} ${theme.hue})`);
    root.style.setProperty("--ring", `oklch(0.52 ${theme.chroma} ${theme.hue})`);
  }

  function selectTheme(themeId: string) {
    setActiveTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem(STORAGE_KEY, themeId);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Wybierz kolor akcentu"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">Kolor</span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-full right-0 mt-2 z-50"
        >
          <Card className="card-modern shadow-xl">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Kolor akcentu</p>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => selectTheme(theme.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div
                      className="w-6 h-6 rounded-full relative flex items-center justify-center"
                      style={{ background: `oklch(0.52 ${theme.chroma} ${theme.hue})` }}
                    >
                      {activeTheme === theme.id && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{theme.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
