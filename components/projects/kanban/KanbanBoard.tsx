"use client"

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { updateTaskStatus } from "@/app/lib/actions/tasks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "DONE", title: "Done" },
];

interface KanbanBoardProps {
  initialTasks: any[];
  projectId: string;
  userId: string;
}

export function KanbanBoard({ initialTasks, projectId, userId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!mounted) return null;

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = tasks.some((t) => t.id === activeId);
    const isOverAColumn = COLUMNS.some((col) => col.id === overId);

    if (!isActiveTask) return;

    // Dropping over a column
    if (isOverAColumn) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const task = prev[activeIndex];
        if (task.status === overId) return prev;
        
        const newTasks = [...prev];
        newTasks[activeIndex] = { ...task, status: overId as string };
        return newTasks;
      });
      return;
    }

    // Dropping over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask && activeTask.status !== overTask.status) {
        setTasks((prev) => {
            const activeIndex = prev.findIndex((t) => t.id === activeId);
            const task = prev[activeIndex];
            const newTasks = [...prev];
            newTasks[activeIndex] = { ...task, status: overTask.status };
            return arrayMove(newTasks, activeIndex, prev.findIndex((t) => t.id === overId));
        });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    const finalStatus = task.status;
    const originalTask = initialTasks.find(t => t.id === activeId);

    if (finalStatus !== originalTask?.status) {
      const result = await updateTaskStatus(activeId as string, finalStatus, projectId);
      if (!result?.success) {
        toast.error("Failed to update task status");
        setTasks(initialTasks);
      } else {
        router.refresh();
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4 md:p-8 h-full scrollbar-hide bg-[#fefefe]">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={tasks.filter((t) => t.status === col.id)}
            projectId={projectId}
            userId={userId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: "0.5",
                },
            },
        }),
      }}>
        {activeTask ? <KanbanTaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
