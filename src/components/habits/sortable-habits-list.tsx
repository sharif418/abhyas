"use client";

import { useState, useEffect } from "react";
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
import { motion } from "framer-motion";
import { useReorderHabits } from "@/hooks/use-freeze";
import { useToggleHabit } from "@/hooks/use-habits";
import { useUIStore } from "@/stores/ui-store";
import { HabitRow } from "@/components/habits/habit-row";
import { toBn } from "@/lib/date-bn";
import { TIMES_OF_DAY } from "@/constants";
import type { HabitWithMeta } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Sortable habits list with drag-and-drop reordering.
 * Groups habits by time-of-day; each group is independently sortable.
 */
export function SortableHabitsList({ habits }: { habits: HabitWithMeta[] }) {
  const toggle = useToggleHabit();
  const openHabitDetail = useUIStore((s) => s.openHabitDetail);
  const reorder = useReorderHabits();

  // local ordering state (keyed by time-of-day)
  const [orderedByTime, setOrderedByTime] = useState<Record<string, HabitWithMeta[]>>({});

  useEffect(() => {
    const map: Record<string, HabitWithMeta[]> = {};
    for (const h of habits) {
      (map[h.timeOfDay] ??= []).push(h);
    }
    // sort each group by sortOrder
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    setOrderedByTime(map);
  }, [habits]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (timeOfDay: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = orderedByTime[timeOfDay] ?? [];
    const oldIndex = items.findIndex((h) => h.id === active.id);
    const newIndex = items.findIndex((h) => h.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(items, oldIndex, newIndex);
    setOrderedByTime((prev) => ({ ...prev, [timeOfDay]: newItems }));

    // persist: collect all ids in order across all groups (preserving group order)
    const allIds = [
      ...(orderedByTime["সকাল"] ?? []),
      ...(orderedByTime["দুপুর"] ?? []),
      ...(orderedByTime["বিকাল"] ?? []),
      ...(orderedByTime["রাত"] ?? []),
    ].map((h) => h.id);
    // but we just changed one group; rebuild from state
    const merged = {
      ...orderedByTime,
      [timeOfDay]: newItems,
    };
    const orderedIds = [
      ...(merged["সকাল"] ?? []),
      ...(merged["দুপুর"] ?? []),
      ...(merged["বিকাল"] ?? []),
      ...(merged["রাত"] ?? []),
    ].map((h) => h.id);
    void allIds;
    reorder.mutate(orderedIds);
  };

  return (
    <div className="space-y-6">
      {TIMES_OF_DAY.map((tod) => {
        const list = orderedByTime[tod.key] ?? [];
        if (list.length === 0) return null;
        const ids = list.map((h) => h.id);
        return (
          <section key={tod.key}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="text-base">{tod.emoji}</span>
              <h2 className="font-bold">{tod.label}</h2>
              <span className="text-xs text-muted-foreground">
                {toBn(list.length)} টি
              </span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(tod.key, e)}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {list.map((h) => (
                    <SortableHabitRow
                      key={h.id}
                      habit={h}
                      onToggle={() => toggle.mutate({ habitId: h.id })}
                      onOpen={() => openHabitDetail(h.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        );
      })}
    </div>
  );
}

function SortableHabitRow({
  habit,
  onToggle,
  onOpen,
}: {
  habit: HabitWithMeta;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded-lg p-1 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="টেনে সাজান"
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <HabitRow habit={habit} onToggle={onToggle} onOpen={onOpen} />
      </div>
    </div>
  );
}
