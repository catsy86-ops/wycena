"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Pojedynczy sortable wiersz — owija children i dodaje uchwyt do przeciągania.
 */
export function SortableItem({ id, children, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-border/50 hover:bg-accent/30 transition-colors",
        isDragging && "bg-primary/5 shadow-lg rounded-lg",
        className
      )}
    >
      {/* Drag handle */}
      <td className="w-8 p-1">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-8 w-8 rounded cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
          aria-label="Przeciągnij aby zmienić kolejność"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      {children}
    </tr>
  );
}

interface SortableListProps {
  items: { id: string }[];
  onReorder: (items: { id: string }[]) => void;
  children: React.ReactNode;
  tableHeader: React.ReactNode;
}

/**
 * Wrapper DnD context dla tabeli z sortowalnymi wierszami.
 * Użycie:
 * <SortableList items={items} onReorder={setItems} tableHeader={...}>
 *   {items.map(item => <SortableItem key={item.id} id={item.id}>...</SortableItem>)}
 * </SortableList>
 */
export function SortableList({ items, onReorder, children, tableHeader }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              {tableHeader}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {children}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}
