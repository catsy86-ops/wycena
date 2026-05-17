"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Wrench, FileText, Users, BarChart3 } from "lucide-react";

const STORAGE_KEY = "wycenka_onboarding_done";

const STEPS = [
  {
    icon: <Wrench className="h-8 w-8 text-primary" />,
    title: "Witaj w WYCENKA!",
    description: "System wycen usług hydraulicznych. Twórz profesjonalne wyceny, zarządzaj klientami i śledź czas pracy.",
  },
  {
    icon: <FileText className="h-8 w-8 text-primary" />,
    title: "Twórz wyceny",
    description: "Dodaj usługi z katalogu, ustaw rabaty, użyj zaawansowanego modelu wyceny. Eksportuj do PDF jednym kliknięciem.",
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Zarządzaj klientami",
    description: "Baza klientów z historią wycen, tagami i notatkami. Szybki dostęp do danych kontaktowych.",
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    title: "Analizuj wyniki",
    description: "Raporty, wykresy trendów, porównanie wycen. Śledź przychód i konwersję w czasie rzeczywistym.",
  },
];

export function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Pokaż po krótkim opóźnieniu
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  function handleClose() {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  if (!show) return null;

  const currentStep = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

        {/* Card */}
        <motion.div
          className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl glass-card"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          key={step}
        >
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="flex flex-col items-center text-center gap-4">
            <motion.div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {currentStep.icon}
            </motion.div>

            <div>
              <h3 className="text-lg font-bold">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{currentStep.description}</p>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 6,
                    background: i === step ? "oklch(0.52 0.19 220)" : "oklch(0.52 0.19 220 / 0.2)",
                  }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Pomiń
              </Button>
              <Button className="btn-primary flex-1" onClick={handleNext}>
                {step < STEPS.length - 1 ? (
                  <>Dalej <ArrowRight className="h-4 w-4" /></>
                ) : (
                  "Zaczynamy!"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
