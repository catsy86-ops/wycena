"use client";

import { useMemo } from "react";
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
import type { QuoteItem } from "@/types";

interface SortableQuoteItemsProps {
  items: QuoteItem[];
  onReorder: (items: QuoteItem[]) => void;
  renderItem: (item: QuoteItem, dragHandle: React.ReactNode) => React.ReactNode;
}

function SortableRow({
  item,
  renderItem,
}: {
  item: QuoteItem;
  renderItem: (item: QuoteItem, dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  const dragHandle = (
    <button
      className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      {...attributes}
      {...listeners}
      aria-label="Przeciągnij aby zmienić kolejność"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <tr ref={setNodeRef} style={style}>
      {renderItem(item, dragHandle)}
    </tr>
  );
}

/**
 * Wrapper DnD dla pozycji wyceny.
 * Użycie:
 * <SortableQuoteItems
 *   items={items}
 *   onReorder={setItems}
 *   renderItem={(item, dragHandle) => (
 *     <>
 *       <td>{dragHandle}</td>
 *       <td>{item.name}</td>
 *       ...
 *     </>
 *   )}
 * />
 */
export function SortableQuoteItems({ items, onReorder, renderItem }: SortableQuoteItemsProps) {
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
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableRow key={item.id} item={item} renderItem={renderItem} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
