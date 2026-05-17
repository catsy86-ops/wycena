"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  /** Widoczna na mobile w widoku karty */
  mobileVisible?: boolean;
  /** Wyrównanie */
  align?: "left" | "center" | "right";
  /** Szerokość (desktop) */
  width?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  /** Render akcji (desktop: ostatnia kolumna, mobile: pod kartą) */
  renderActions?: (item: T) => React.ReactNode;
  /** Render mobile card header (np. avatar + nazwa) */
  renderMobileHeader?: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

/**
 * Responsive table — tabela na desktop, karty na mobile.
 * Automatycznie przełącza widok w zależności od szerokości ekranu.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  renderActions,
  renderMobileHeader,
  emptyMessage = "Brak danych",
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">{emptyMessage}</p>;
  }

  const mobileColumns = columns.filter((c) => c.mobileVisible !== false);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.width ? `w-[${col.width}]` : ""} style={{ textAlign: col.align }}>
                  {col.label}
                </TableHead>
              ))}
              {renderActions && <TableHead className="w-20">Akcje</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, i) => (
              <motion.tr
                key={keyExtractor(item)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="border-b border-border/50 hover:bg-accent/30 transition-colors"
              >
                {columns.map((col) => (
                  <TableCell key={col.key} style={{ textAlign: col.align }}>
                    {col.render(item)}
                  </TableCell>
                ))}
                {renderActions && <TableCell>{renderActions(item)}</TableCell>}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        <AnimatePresence>
          {data.map((item, i) => (
            <motion.div
              key={keyExtractor(item)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
              className="rounded-lg border border-border/50 p-3 hover:bg-accent/20 transition-colors"
            >
              {/* Header */}
              {renderMobileHeader && (
                <div className="mb-2">{renderMobileHeader(item)}</div>
              )}

              {/* Fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {mobileColumns.map((col) => (
                  <div key={col.key} className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{col.label}</span>
                    <span className="text-sm font-medium">{col.render(item)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {renderActions && (
                <div className="flex justify-end mt-2 pt-2 border-t border-border/30">
                  {renderActions(item)}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
