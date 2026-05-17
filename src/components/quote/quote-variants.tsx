"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Plus, Check, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/calculations";
import type { QuoteVariant, QuoteItem, QuoteAdditionalCost } from "@/types";

interface QuoteVariantsProps {
  variants: QuoteVariant[];
  selectedVariantId?: string;
  onVariantsChange: (variants: QuoteVariant[]) => void;
  onSelectVariant: (id: string) => void;
  /** Aktualne pozycje (do kopiowania jako bazowy wariant) */
  currentItems: QuoteItem[];
  currentCosts: QuoteAdditionalCost[];
  currentDiscount: number;
  currentTotals: { netto: number; vat: number; brutto: number };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

const VARIANT_PRESETS = [
  { name: "Ekonomiczny", factor: 0.7, description: "Podstawowe materiały, standardowe wykonanie" },
  { name: "Standard", factor: 1.0, description: "Dobrej jakości materiały, staranne wykonanie" },
  { name: "Premium", factor: 1.4, description: "Najwyższej jakości materiały, wykończenie premium" },
];

/**
 * Warianty wyceny — ekonomiczny / standard / premium.
 * Klient wybiera wariant, który mu odpowiada.
 */
export function QuoteVariants({
  variants, selectedVariantId, onVariantsChange, onSelectVariant,
  currentItems, currentCosts, currentDiscount, currentTotals,
}: QuoteVariantsProps) {
  const [showPresets, setShowPresets] = useState(false);

  function addFromPresets() {
    const newVariants: QuoteVariant[] = VARIANT_PRESETS.map((preset) => ({
      id: generateId(),
      name: preset.name,
      description: preset.description,
      items: currentItems.map((item) => ({
        ...item,
        id: generateId(),
        priceNettoPerUnit: Math.round(item.priceNettoPerUnit * preset.factor * 100) / 100,
        nettotal: Math.round(item.nettotal * preset.factor * 100) / 100,
        vatAmount: Math.round(item.vatAmount * preset.factor * 100) / 100,
        bruttoTotal: Math.round(item.bruttoTotal * preset.factor * 100) / 100,
      })),
      additionalCosts: currentCosts,
      globalDiscountPercent: currentDiscount,
      totalNetto: Math.round(currentTotals.netto * preset.factor * 100) / 100,
      totalVat: Math.round(currentTotals.vat * preset.factor * 100) / 100,
      totalBrutto: Math.round(currentTotals.brutto * preset.factor * 100) / 100,
    }));
    onVariantsChange(newVariants);
    setShowPresets(false);
  }

  function removeVariant(id: string) {
    onVariantsChange(variants.filter((v) => v.id !== id));
  }

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Warianty wyceny ({variants.length})
          </span>
          {variants.length === 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowPresets(true)}>
              <Plus className="h-3 w-3" />Dodaj warianty
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Presety */}
        {showPresets && variants.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">Wygeneruj 3 warianty na podstawie aktualnych pozycji:</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {VARIANT_PRESETS.map((p) => (
                <div key={p.name} className="rounded-lg border p-2">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-muted-foreground">{Math.round(p.factor * 100)}% ceny</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPresets(false)}>Anuluj</Button>
              <Button size="sm" className="btn-primary h-7 text-xs" onClick={addFromPresets} disabled={currentItems.length === 0}>
                Generuj warianty
              </Button>
            </div>
          </motion.div>
        )}

        {/* Lista wariantów */}
        {variants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {variants.map((variant) => {
              const isSelected = variant.id === selectedVariantId;
              return (
                <motion.div
                  key={variant.id}
                  className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-accent/30"
                  }`}
                  onClick={() => onSelectVariant(variant.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="font-semibold text-sm">{variant.name}</div>
                  {variant.description && <div className="text-[10px] text-muted-foreground mt-0.5">{variant.description}</div>}
                  <div className="text-lg font-black text-primary mt-2 tabular-nums">{formatCurrency(variant.totalBrutto)}</div>
                  <div className="text-[10px] text-muted-foreground">{variant.items.length} pozycji</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeVariant(variant.id); }}
                    className="absolute bottom-2 right-2 text-muted-foreground/50 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {variants.length === 0 && !showPresets && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Brak wariantów. Dodaj warianty aby klient mógł wybrać opcję.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
