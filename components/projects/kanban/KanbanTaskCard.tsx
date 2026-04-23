"use client"

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight } from "lucide-react";

interface KanbanTaskCardProps {
  task: any;
}

export function KanbanTaskCard({ task }: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "HIGH": return "bg-orange-50 text-orange-600 border-orange-100";
      case "LOW": return "bg-gray-50 text-gray-600 border-gray-100";
      default: return "bg-green-50 text-green-600 border-green-100";
    }
  };

  const getTagColor = (tag: string) => {
    if (tag === "billable") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    return "bg-slate-50 text-slate-600 border-slate-100";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 last:mb-0 cursor-grab active:cursor-grabbing"
    >
      <Card className="p-5 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all rounded-2xl group">
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-1.5 w-8 rounded-full bg-primary" />
            {task.tags?.map((tag: string) => (
              <Badge key={tag} className={`${getTagColor(tag)} border text-[10px] h-5 px-2 font-bold rounded-md shadow-none`}>
                {tag}
              </Badge>
            ))}
            {task.priority && (
              <Badge className={`${getPriorityColor(task.priority)} border text-[10px] h-5 px-2 font-bold rounded-md shadow-none`}>
                {task.priority.toLowerCase()}
              </Badge>
            )}
          </div>

          <div className="flex justify-between items-start gap-4">
            <h4 className="text-sm font-bold text-gray-900 leading-snug">
              {task.title}
            </h4>
            <ChevronRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-none mt-0.5" />
          </div>

          {task.description && (
            <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1">
             {task.estimatedTime && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                    <span>Est. {task.estimatedTime}</span>
                </div>
             )}
             {task.dueDate && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                    <span>Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
             )}
          </div>

          <div className="flex justify-end pt-1">
            <Avatar className="h-7 w-7 border-2 border-white ring-1 ring-gray-50 shadow-sm">
              <AvatarImage src={task.user?.avatar || ""} />
              <AvatarFallback className="bg-gradient-to-br from-green-50 to-emerald-50 text-[10px] font-black text-green-700">
                {task.user?.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </Card>
    </div>
  );
}
