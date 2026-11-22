"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type HandleProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Lista ordenable arrastrando (ratón, táctil y teclado: espacio para coger,
 * flechas para mover, espacio para soltar).
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
  className,
  label,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  children: (item: T, handle: HandleProps, index: number) => React.ReactNode;
  className?: string;
  label: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Pulsa espacio para coger el elemento, usa las flechas para moverlo y espacio otra vez para soltarlo. Escape cancela.",
        },
        announcements: {
          onDragStart: () => `Has cogido un elemento de ${label}.`,
          onDragOver: ({ over }) => (over ? "Moviendo." : "Fuera de la lista."),
          onDragEnd: ({ over }) => (over ? "Elemento colocado." : "Movimiento cancelado."),
          onDragCancel: () => "Movimiento cancelado.",
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol className={className}>
          {items.map((item, index) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => children(item, handle, index)}
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: (handle: HandleProps) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90 shadow-lg" : undefined}
    >
      {children({ ...attributes, ...listeners, ref: setActivatorNodeRef } as HandleProps)}
    </li>
  );
}

/** Asa para arrastrar. */
export function DragHandle({ label, ...props }: HandleProps & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Arrastra para ordenar"
      {...props}
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-[#8492a8] hover:bg-[#eef2f8] hover:text-[#0f1b33] active:cursor-grabbing"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  );
}
