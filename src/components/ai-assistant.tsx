"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Tag, FileText, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/calculations";
import type { ServiceCategory } from "@/types";
import { CATEGORY_LABELS } from "@/types";

// ─── AI Price Suggestion ─────────────────────────────────────────────────────

interface PriceSuggestionProps {
  serviceName: string;
  history: { name: string; price: number }[];
  onApply: (price: number) => void;
}

export function AIPriceSuggestion({ serviceName, history, onApply }: PriceSuggestionProps) {
  const [result, setResult] = useState<{ suggestedPrice: number; confidence: number; source: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const suggest = useCallback(async () => {
    if (!serviceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest_price", serviceName, history }),
      });
      const data = await res.json();
      setResult(data);
    } catch { setResult(null); }
    finally { setLoading(false); }
  }, [serviceName, history]);

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={suggest} disabled={loading || !serviceName.trim()}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        Sugeruj cenę
      </Button>
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs"
          >
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold">{formatCurrency(result.suggestedPrice)}</span>
            <span className="text-muted-foreground">({result.confidence}% pewności)</span>
            <button onClick={() => onApply(result.suggestedPrice)} className="text-primary hover:underline text-[10px]">
              Zastosuj
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Category Suggestion ──────────────────────────────────────────────────

interface CategorySuggestionProps {
  serviceName: string;
  onApply: (category: ServiceCategory) => void;
}

export function AICategorySuggestion({ serviceName, onApply }: CategorySuggestionProps) {
  const [result, setResult] = useState<{ category: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const categorize = useCallback(async () => {
    if (!serviceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "categorize", serviceName }),
      });
      setResult(await res.json());
    } catch { setResult(null); }
    finally { setLoading(false); }
  }, [serviceName]);

  return (
    <div className="space-y-1">
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={categorize} disabled={loading || !serviceName.trim()}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
        Auto-kategoria
      </Button>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[result.category as ServiceCategory] || result.category}</Badge>
            <button onClick={() => onApply(result.category as ServiceCategory)} className="text-primary hover:underline text-[10px]">Zastosuj</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Conversion Prediction ────────────────────────────────────────────────

interface ConversionPredictionProps {
  clientHistory: { total: number; accepted: number };
  quoteValue: number;
  avgQuoteValue: number;
}

export function AIConversionPrediction({ clientHistory, quoteValue, avgQuoteValue }: ConversionPredictionProps) {
  const [result, setResult] = useState<{ probability: number; label: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const predict = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "predict_conversion", clientHistory, quoteValue, avgQuoteValue }),
      });
      setResult(await res.json());
    } catch { setResult(null); }
    finally { setLoading(false); }
  }, [clientHistory, quoteValue, avgQuoteValue]);

  const color = result
    ? result.probability >= 70 ? "text-emerald-600" : result.probability >= 40 ? "text-amber-600" : "text-red-500"
    : "";

  return (
    <div className="space-y-1">
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={predict} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
        Predykcja konwersji
      </Button>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center gap-2 text-xs font-semibold ${color}`}>
            <span>{result.probability}%</span>
            <span className="text-muted-foreground font-normal">— {result.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Description Generator ────────────────────────────────────────────────

interface DescriptionGeneratorProps {
  serviceName: string;
  category?: string;
  onApply: (description: string) => void;
}

export function AIDescriptionGenerator({ serviceName, category, onApply }: DescriptionGeneratorProps) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!serviceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_description", serviceName, category }),
      });
      const data = await res.json();
      setResult(data.description);
    } catch { setResult(null); }
    finally { setLoading(false); }
  }, [serviceName, category]);

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={generate} disabled={loading || !serviceName.trim()}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
        Generuj opis
      </Button>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed border rounded-md p-2 bg-muted/30">{result}</p>
            <button onClick={() => onApply(result)} className="text-primary hover:underline text-[10px]">Zastosuj opis</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
