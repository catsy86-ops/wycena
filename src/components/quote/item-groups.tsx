"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations";
import type { QuoteItem } from "@/types";

export interface ItemGroup {
  id: string;
  name: string;
  itemIds: string[];
  collapsed?: boolean;
}

interface ItemGroupsProps {
  groups: ItemGroup[];
  items: QuoteItem[];
  onGroupsChange: (groups: ItemGroup[]) => void;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

/**
 * Grupowanie pozycji wyceny w sekcje (np. "Łazienka", "Kuchnia").
 * Każda grupa ma podsumowanie kwoty.
 */
export function ItemGroups({ groups, items, onGroupsChange }: ItemGroupsProps) {
  const [newGroupName, setNewGroupName] = useState("");

  function addGroup() {
    if (!newGroupName.trim()) return;
    onGroupsChange([...groups, { id: generateId(), name: newGroupName.trim(), itemIds: [] }]);
    setNewGroupName("");
  }

  function removeGroup(id: string) {
    onGroupsChange(groups.filter((g) => g.id !== id));
  }

  function toggleCollapse(id: string) {
    onGroupsChange(groups.map((g) => g.id === id ? { ...g, collapsed: !g.collapsed } : g));
  }

  function getGroupTotal(group: ItemGroup) {
    return items
      .filter((i) => group.itemIds.includes(i.id))
      .reduce((s, i) => s + i.bruttoTotal, 0);
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nazwa grupy (np. Łazienka)"
          className="h-8 text-xs w-48"
          onKeyDown={(e) => { if (e.key === "Enter") addGroup(); }}
        />
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addGroup}>
          <FolderOpen className="h-3 w-3" />Dodaj grupę
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nowa grupa..."
          className="h-7 text-xs w-36"
          onKeyDown={(e) => { if (e.key === "Enter") addGroup(); }}
        />
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addGroup} disabled={!newGroupName.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <AnimatePresence>
        {groups.map((group) => {
          const total = getGroupTotal(group);
          const itemCount = group.itemIds.length;
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5"
            >
              <button onClick={() => toggleCollapse(group.id)} className="text-muted-foreground">
                {group.collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold flex-1">{group.name}</span>
              <span className="text-[10px] text-muted-foreground">{itemCount} poz.</span>
              {total > 0 && <span className="text-xs font-bold text-primary tabular-nums">{formatCurrency(total)}</span>}
              <button onClick={() => removeGroup(group.id)} className="text-muted-foreground/50 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
