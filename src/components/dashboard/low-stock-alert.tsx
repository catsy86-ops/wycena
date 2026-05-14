"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMaterialStore } from "@/store/material-store";
import { motion } from "framer-motion";
import { AlertTriangle, Package } from "lucide-react";

export function LowStockAlert() {
  const materials = useMaterialStore((s) => s.materials);

  const lowStock = useMemo(() => {
    return materials
      .filter((m) => m.stockQuantity <= m.minStockLevel)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 5);
  }, [materials]);

  if (lowStock.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link href="/materialy">
        <div className="card-modern rounded-xl border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 sm:p-4 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                Niski stan magazynowy ({lowStock.length})
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 truncate">
                {lowStock.map((m) => m.name).join(", ")}
              </div>
            </div>
            <Package className="h-4 w-4 text-amber-500 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
