"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlignLeft,
  CheckSquare,
  Clock,
  ListTree,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
import { AvatarStack } from "@/components/avatar-stack";
import { statusIcon } from "@/components/projects/task-subtasks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDay, type Subtask, type Task } from "@/lib/domain";
import { priorityVariant, taskStatusColor } from "@/lib/status";
import { buildSubtaskTree, flattenTree } from "@/lib/subtask-tree";
import { isOptimizableImageSrc } from "@/lib/r2";
import { cn, formatDuration } from "@/lib/utils";

const MAX_SUBTASK_ROWS = 6;

/**
 * One card on a board, drawn the way Trello draws them: labels across the top,
 * the title, then a row of small badges for what is worth knowing at a glance —
 * due date, checklist progress, attachments, logged time.
 *
 * The title is the link into the task; the card itself is the drag handle. The
 * "…" button exists because dragging is unavailable on touch screens and from
 * the keyboard, and the board has to work for those people too.
 */
export function BoardCard({
  task,
  subtasks,
  today,
  canManage,
  dragging,
  onDragStart,
  onDragEnd,
  onMoveRequest,
  onSubtasksRequest,
  onAddSubtaskRequest,
  onEditSubtaskRequest,
  onDeleteSubtaskRequest,
}: {
  task: Task;
  /** This task's subtasks, drawn beneath the card as a vertical tree. */
  subtasks: Subtask[];
  /**
   * Today as `yyyy-MM-dd`, resolved on the server. Passed in rather than read
   * here so the overdue colouring cannot differ between the server render and
   * a browser in another timezone.
   */
  today: string;
  canManage: boolean;
  dragging: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  /** Opens the keyboard- and touch-friendly move dialog. */
  onMoveRequest: () => void;
  /** Opens the card's subtasks. */
  onSubtasksRequest: () => void;
  /** Opens the dialog to add a subtask beneath the one clicked. */
  onAddSubtaskRequest: (parent: { id: string; title: string }) => void;
  onEditSubtaskRequest: (subtask: Subtask) => void;
  onDeleteSubtaskRequest: (subtask: Subtask) => void;
}) {
  const overdue = Boolean(task.dueDate && task.dueDate < today && task.status !== "done");
  const dueToday = task.dueDate === today && task.status !== "done";
  const rows = flattenTree(buildSubtaskTree(subtasks));
  const shown = rows.slice(0, MAX_SUBTASK_ROWS);
  const checklistDone = task.subtasksTotal > 0 && task.subtasksDone === task.subtasksTotal;

  return (
    <div
      data-card={task.id}
      draggable={canManage}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative space-y-2 rounded-md border bg-card p-2.5 text-sm shadow-sm transition-colors",
        "hover:border-primary/30",
        canManage && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      {task.coverUrl ? (
        <div className="relative -mx-2.5 -mt-2.5 h-28 overflow-hidden rounded-t-md bg-muted">
          <Image
            src={task.coverUrl}
            alt=""
            fill
            draggable={false}
            sizes="18rem"
            className="object-cover"
            unoptimized={!isOptimizableImageSrc(task.coverUrl)}
          />
        </div>
      ) : null}

      {task.labels.length ? (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label.id}
              title={label.name}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-start gap-1">
        <Link
          href={`/projects/project/${task.projectId}/tasks/${task.id}`}
          // A drag that starts on the link would otherwise drag the URL.
          draggable={false}
          className="min-w-0 flex-1 break-words font-medium leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {task.title}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Subtasks of ${task.title}`}
          onClick={onSubtasksRequest}
          className="-mt-1 h-6 w-6 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ListTree className="h-3.5 w-3.5" />
        </Button>
        {canManage ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${task.title}`}
            onClick={onMoveRequest}
            className="-mr-1 -mt-1 h-6 w-6 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {shown.length ? (
        <ul aria-label={`Subtasks of ${task.title}`} className="space-y-0.5 border-l pl-2 text-xs">
          {shown.map((node) => {
            const Icon = statusIcon[node.status];
            return (
              <li
                key={node.id}
                className="group/row flex items-center gap-1.5"
                style={{ paddingLeft: node.depth * 12 }}
              >
                <Icon
                  aria-hidden
                  className="h-3 w-3 shrink-0"
                  style={{ color: taskStatusColor[node.status] }}
                />
                {canManage ? (
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => onAddSubtaskRequest({ id: node.id, title: node.title })}
                    aria-label={`Add a subtask under ${node.title}`}
                    title={`Add a subtask under ${node.title}`}
                    className={cn(
                      "min-w-0 truncate rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      node.status === "done" && "text-muted-foreground line-through",
                    )}
                  >
                    {node.title}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      node.status === "done" && "text-muted-foreground line-through",
                    )}
                    title={node.title}
                  >
                    {node.title}
                  </span>
                )}
                {canManage ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        draggable={false}
                        aria-label={`Actions for ${node.title}`}
                        className="ml-auto h-5 w-5 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onSelect={() => onEditSubtaskRequest(node)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDeleteSubtaskRequest(node)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            );
          })}
          {rows.length > shown.length ? (
            <li className="pl-4 text-[11px] text-muted-foreground">
              +{rows.length - shown.length} more
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
        <span
          className={cn(
            "rounded px-1 font-medium capitalize",
            priorityVariant[task.priority] === "destructive" && "bg-destructive/10 text-destructive",
          )}
        >
          {task.priority}
        </span>

        {task.dueDate ? (
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1",
              overdue && "bg-destructive text-destructive-foreground",
              dueToday && "bg-warning text-warning-foreground",
              task.status === "done" && "bg-success/20 text-foreground",
            )}
            title={overdue ? "Overdue" : dueToday ? "Due today" : "Due date"}
          >
            <Clock className="h-3 w-3" />
            {formatDay(task.dueDate)}
          </span>
        ) : null}

        {task.description ? (
          <AlignLeft className="h-3 w-3" aria-label="Has a description" />
        ) : null}

        {task.subtasksTotal ? (
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1",
              checklistDone && "bg-success text-success-foreground",
            )}
            title="Checklist"
          >
            <CheckSquare className="h-3 w-3" />
            {task.subtasksDone}/{task.subtasksTotal}
          </span>
        ) : null}

        {task.attachmentCount ? (
          <span className="flex items-center gap-1" title="Attachments">
            <Paperclip className="h-3 w-3" />
            {task.attachmentCount}
          </span>
        ) : null}

        {task.trackedHours ? (
          <span className="font-mono" title="Time logged">
            {formatDuration(task.trackedHours)}
          </span>
        ) : null}

        {task.assignees.length ? (
          <span className="ml-auto">
            <AvatarStack people={task.assignees} max={3} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
