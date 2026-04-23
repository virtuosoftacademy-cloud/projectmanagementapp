"use client"

import { useDroppable } from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { Plus } from "lucide-react";

import { CreateTaskDialog } from "./CreateTaskDialog";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: any[];
  projectId: string;
  userId: string;
}

export function KanbanColumn({ id, title, tasks, projectId, userId }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col w-80 min-w-[20rem] bg-gray-50/40 rounded-3xl p-5 border border-transparent shadow-none">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-700">{title} <span className="ml-1 text-gray-400 font-normal">{tasks.length}</span></h3>
        </div>
        <CreateTaskDialog 
          projectId={projectId} 
          userId={userId} 
          defaultStatus={id} 
        />
      </div>

      <div ref={setNodeRef} className="flex-1 min-h-[500px]">
        <SortableContext 
          items={tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {tasks.map((task) => (
              <KanbanTaskCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
        
        {tasks.length === 0 && (
            <div className="h-32 border-2 border-dashed border-gray-100/80 rounded-[2rem] flex items-center justify-center bg-white/30">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] ml-2">Empty Slot</span>
            </div>
        )}
      </div>
    </div>
  );
}
