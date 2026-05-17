"use client";

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { QuoteItem, VatRate, Unit } from "@/types";
import { VAT_RATE_LABELS, UNIT_LABELS } from "@/types";
import { calcQuoteItem, formatCurrency } from "@/lib/calculations";
import { useMemo } from "react";

interface QuoteItemsDnDProps {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
  onCopyItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
}

function SortableRow({
  item,
  onUpdate,
  onCopy,
  onRemove,
}: {
  item: QuoteItem;
  onUpdate: (id: string, updates: Partial<QuoteItem>) => void;
  onCopy: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8">
        <button className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground/40 hover:text-muted-foreground" {...attributes} {...listeners} aria-label="Przeciągnij">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <Input value={item.name} onChange={(e) => onUpdate(item.id, { name: e.target.value })} placeholder="Nazwa usługi" className="h-9" />
      </TableCell>
      <TableCell>
        <Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => onUpdate(item.id, { quantity: parseFloat(e.target.value) || 0 })} className="h-9 w-20" />
      </TableCell>
      <TableCell>
        <Select value={item.unit} onValueChange={(v) => onUpdate(item.id, { unit: (v ?? "szt") as Unit })}>
          <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input type="number" min="0" step="0.01" value={item.priceNettoPerUnit} onChange={(e) => onUpdate(item.id, { priceNettoPerUnit: parseFloat(e.target.value) || 0 })} className="h-9 w-28" />
      </TableCell>
      <TableCell>
        <Select value={String(item.vatRate)} onValueChange={(v) => onUpdate(item.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
          <SelectTrigger className="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input type="number" min="0" max="100" value={item.discountPercent} onChange={(e) => onUpdate(item.id, { discountPercent: parseFloat(e.target.value) || 0 })} className="h-9 w-20" />
      </TableCell>
      <TableCell className="text-right font-semibold text-sm tabular-nums">{formatCurrency(item.nettotal)}</TableCell>
      <TableCell className="text-right font-bold text-primary text-sm tabular-nums">{formatCurrency(item.bruttoTotal)}</TableCell>
      <TableCell>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onCopy(item.id)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Tabela pozycji wyceny z Drag & Drop.
 * Drop-in replacement dla zwykłej tabeli items.
 */
export function QuoteItemsDnD({ items, onItemsChange, onCopyItem, onRemoveItem }: QuoteItemsDnDProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    onItemsChange(arrayMove(items, oldIndex, newIndex));
  }

  function handleUpdate(id: string, updates: Partial<QuoteItem>) {
    onItemsChange(items.map((item) => item.id === id ? calcQuoteItem({ ...item, ...updates }) : item));
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="table-header-industrial">
          <TableRow>
            <TableHead className="w-8" />
            <TableHead className="min-w-44">Nazwa</TableHead>
            <TableHead className="w-20">Ilość</TableHead>
            <TableHead className="w-24">Jedn.</TableHead>
            <TableHead className="w-28">Cena netto</TableHead>
            <TableHead className="w-20">VAT</TableHead>
            <TableHead className="w-20">Rabat%</TableHead>
            <TableHead className="text-right w-24">Netto</TableHead>
            <TableHead className="text-right w-24">Brutto</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdate}
                  onCopy={onCopyItem}
                  onRemove={onRemoveItem}
                />
              ))}
            </SortableContext>
          </DndContext>
        </TableBody>
      </Table>
    </div>
  );
}
