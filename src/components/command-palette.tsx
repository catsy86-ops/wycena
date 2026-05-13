"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Users, Package, Settings, Calendar, Clock, FileCheck, ArrowRight, X } from "lucide-react";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const services = useServiceStore((s) => s.services);
  const clients = useClientStore((s) => s.clients);
  const quotes = useQuoteStore((s) => s.quotes);

  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleOpen();
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleOpen]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const commands: CommandItem[] = [
    {
      id: "nav-dashboard",
      label: "Pulpit",
      icon: <Settings className="h-4 w-4" />,
      action: () => router.push("/"),
      category: "Nawigacja",
    },
    {
      id: "nav-uslugi",
      label: "Usługi",
      icon: <Package className="h-4 w-4" />,
      action: () => router.push("/uslugi"),
      category: "Nawigacja",
    },
    {
      id: "nav-klienci",
      label: "Klienci",
      icon: <Users className="h-4 w-4" />,
      action: () => router.push("/klienci"),
      category: "Nawigacja",
    },
    {
      id: "nav-wyceny",
      label: "Wyceny",
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push("/wyceny"),
      category: "Nawigacja",
    },
    {
      id: "nav-nowa-wycena",
      label: "Nowa wycena",
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push("/wyceny/nowa"),
      category: "Akcje",
    },
    {
      id: "nav-ustawienia",
      label: "Ustawienia",
      icon: <Settings className="h-4 w-4" />,
      action: () => router.push("/ustawienia"),
      category: "Nawigacja",
    },
    {
      id: "nav-materialy",
      label: "Materiały",
      icon: <Package className="h-4 w-4" />,
      action: () => router.push("/materialy"),
      category: "Nawigacja",
    },
    {
      id: "nav-harmonogram",
      label: "Harmonogram",
      icon: <Calendar className="h-4 w-4" />,
      action: () => router.push("/harmonogram"),
      category: "Nawigacja",
    },
    {
      id: "nav-czas",
      label: "Śledzenie czasu",
      icon: <Clock className="h-4 w-4" />,
      action: () => router.push("/czas"),
      category: "Nawigacja",
    },
    {
      id: "nav-faktury",
      label: "Faktury",
      icon: <FileCheck className="h-4 w-4" />,
      action: () => router.push("/faktury"),
      category: "Nawigacja",
    },
    {
      id: "nav-raporty",
      label: "Raporty",
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push("/raporty"),
      category: "Nawigacja",
    },
    {
      id: "nav-szablony",
      label: "Szablony",
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push("/szablony"),
      category: "Nawigacja",
    },
  ];

  services.forEach((s) => {
    commands.push({
      id: `service-${s.id}`,
      label: s.name,
      description: s.description,
      icon: <Package className="h-4 w-4" />,
      action: () => router.push("/uslugi"),
      category: "Usługi",
    });
  });

  clients.forEach((c) => {
    commands.push({
      id: `client-${c.id}`,
      label: c.name,
      description: c.phone,
      icon: <Users className="h-4 w-4" />,
      action: () => router.push("/klienci"),
      category: "Klienci",
    });
  });

  quotes.forEach((q) => {
    commands.push({
      id: `quote-${q.id}`,
      label: q.number,
      description: q.clientName,
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push(`/wyceny/${q.id}`),
      category: "Wyceny",
    });
  });

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      (cmd.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatGrouped = Object.entries(grouped).flatMap(([_, items]) => items);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatGrouped.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatGrouped[selectedIndex]) {
      e.preventDefault();
      flatGrouped[selectedIndex].action();
      setOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Szukaj komend, usług, klientów, wycen..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {flatGrouped.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Brak wyników dla &quot;{search}&quot;
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="mb-2">
                      <div className="text-xs font-medium text-muted-foreground px-3 py-1.5 uppercase tracking-wider">
                        {category}
                      </div>
                      {items.map((cmd) => {
                        const globalIndex = flatGrouped.indexOf(cmd);
                        return (
                          <button
                            key={cmd.id}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                              globalIndex === selectedIndex
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                            }`}
                            onClick={() => {
                              cmd.action();
                              setOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                          >
                            <span className="text-muted-foreground shrink-0">{cmd.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{cmd.label}</div>
                              {cmd.description && (
                                <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
                    Nawigacja
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
                    Wybierz
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd>
                  Zamknij
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
