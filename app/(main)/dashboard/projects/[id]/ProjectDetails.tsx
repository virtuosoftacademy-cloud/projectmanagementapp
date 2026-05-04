'use client';

import { useState, useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import {
    ArrowLeft, Plus, ChevronDown, ChevronRight,
    CheckCircle2, Clock, Users, ListTodo, Calendar as CalendarIcon, TrendingUp
} from "lucide-react";

import Link from "next/link";

import type { Project, ProjectDetailClientProps, Task, TaskStatus } from "@/app/types";
import { mockUsers, mockTimeEntries, Teams } from "@/app/data/mock";

const columns: { status: TaskStatus; label: string }[] = [
    { status: "todo", label: "To Do" },
    { status: "in_progress", label: "In Progress" },
    { status: "in_review", label: "In Review" },
    { status: "done", label: "Done" },
];

const priorityColors: Record<string, string> = {
    urgent: "bg-destructive/10 text-destructive",
    high: "bg-warning/10 text-warning",
    medium: "bg-primary/10 text-primary",
    low: "bg-muted text-muted-foreground",
    none: "bg-muted text-muted-foreground",
};

const statusColors: Record<TaskStatus, string> = {
    todo: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/10 text-primary",
    in_review: "bg-warning/10 text-warning",
    done: "bg-success/10 text-success",
};

function TaskCard({ task, subTasks }: { task: Task; subTasks: Task[] }) {
    const [expanded, setExpanded] = useState(false);

    const assignees = mockUsers.filter((u) => task.assigneeIds.includes(u.id));
    const hasSubTasks = subTasks.length > 0;
    const doneSubTasks = subTasks.filter((s) => s.status === "done").length;

    return (
        <div className="space-y-1">
            <Card className="border shadow-none hover:border-primary/20 transition-colors cursor-grab active:cursor-grabbing">
                <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-1.5">
                        {hasSubTasks && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                                className="mt-0.5 p-0.5 rounded hover:bg-muted transition-colors"
                            >
                                {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                        )}
                        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
                    </div>

                    {task.isBillable && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-success/30 text-success">
                            billable
                        </Badge>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
                                {task.priority}
                            </Badge>
                            {hasSubTasks && <span className="text-[10px] text-muted-foreground">{doneSubTasks}/{subTasks.length}</span>}
                        </div>

                        <div className="flex -space-x-1">
                            {assignees.slice(0, 3).map((a) => (
                                <Avatar key={a.id} className="h-5 w-5 border border-background">
                                    <AvatarFallback className="text-[9px] bg-muted">{a.name[0]}</AvatarFallback>
                                </Avatar>
                            ))}
                        </div>
                    </div>

                    {task.estimatedEffortMinutes && (
                        <p className="text-[11px] text-muted-foreground">
                            Est. {Math.floor(task.estimatedEffortMinutes / 60)}h {task.estimatedEffortMinutes % 60}m
                        </p>
                    )}

                    {task.dueDate && (
                        <p className="text-[11px] text-muted-foreground">
                            Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                    )}
                </CardContent>
            </Card>

            {expanded && subTasks.length > 0 && (
                <div className="ml-3 pl-3 border-l-2 border-muted space-y-1">
                    {subTasks.map((sub) => {
                        const subAssignees = mockUsers.filter((u) => sub.assigneeIds.includes(u.id));
                        return (
                            <Card key={sub.id} className="border shadow-none bg-muted/30">
                                <CardContent className="p-2.5 space-y-1">
                                    <p className="text-xs font-medium">{sub.title}</p>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${priorityColors[sub.priority]}`}>
                                            {sub.priority}
                                        </Badge>
                                        <div className="flex -space-x-1">
                                            {subAssignees.map((a) => (
                                                <Avatar key={a.id} className="h-4 w-4 border border-background">
                                                    <AvatarFallback className="text-[8px] bg-muted">{a.name[0]}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ProjectDetails({
    project,
    initialTasks,
}: ProjectDetailClientProps) {

    const [tasks, setTasks] = useState(initialTasks);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const taskId = result.draggableId;
        const newStatus = result.destination.droppableId as TaskStatus;

        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        // TODO: Add server action to persist change
    };

    // ==================== ANALYTICS ====================
    const analytics = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === "done").length;
        const inProgress = tasks.filter((t) => t.status === "in_progress").length;
        const inReview = tasks.filter((t) => t.status === "in_review").length;
        const todo = tasks.filter((t) => t.status === "todo").length;
        const completion = total ? Math.round((done / total) * 100) : 0;

        const taskIds = new Set(tasks.map((t) => t.id));
        const projectEntries = mockTimeEntries.filter((e) => taskIds.has(e.taskId));

        const loggedMinutes = projectEntries.reduce((sum, e) => sum + e.duration, 0);
        const estimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedEffortMinutes ?? 0), 0);
        const billableMinutes = tasks
            .filter((t) => t.isBillable)
            .reduce((sum, t) => {
                const entries = projectEntries.filter((e) => e.taskId === t.id);
                return sum + entries.reduce((s, e) => s + e.duration, 0);
            }, 0);

        const totalCostPkr = projectEntries.reduce((sum, e) => {
            const user = mockUsers.find((u) => u.id === e.userId);
            const rate = user?.hourlyRatePkr ?? 0;
            return sum + (e.duration / 60) * rate;
        }, 0);

        return {
            total,
            done,
            inProgress,
            inReview,
            todo,
            completion,
            loggedHours: loggedMinutes / 60,
            estimatedHours: estimatedMinutes / 60,
            billableHours: billableMinutes / 60,
            totalCostPkr,
        };
    }, [tasks]);

    // ==================== MEMBERS ====================
    const members = useMemo(() => {
        return mockUsers.filter((u) => Teams?.includes(u.id) || false);
    }, [project]);

    const memberStats = (userId: string) => {
        const userTasks = tasks.filter((t) => t.assigneeIds.includes(userId));
        const done = userTasks.filter((t) => t.status === "done").length;
        const total = userTasks.length;
        const minutes = mockTimeEntries
            .filter((e) => e.userId === userId && tasks.some((t) => t.id === e.taskId))
            .reduce((s, e) => s + e.duration, 0);

        return {
            done,
            total,
            hours: minutes / 60,
            completion: total ? Math.round((done / total) * 100) : 0,
        };
    };

    // Group tasks by status for Kanban
    const tasksByStatus = useMemo(() => {
        const grouped: Partial<Record<TaskStatus, Task[]>> = {};
        columns.forEach(({ status }) => {
            grouped[status] = tasks.filter((t) => t.status === status && !t.parentTaskId);
        });
        return grouped;
    }, [tasks]);

    return (
        <div className="space-y-6 px-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/projects">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
                        <Badge variant="secondary" className="capitalize">{project.status}</Badge>
                    </div>
                    {project.description && (
                        <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    )}
                </div>
            </div>

            <div className="flex">
                <h2 style={{ backgroundColor: project.color }} className="p-2 rounded-lg text-lg font-semibold text-white">Project Overview</h2>
            </div>

            {/* Analytics Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <ListTodo className="h-3.5 w-3.5" /> Tasks
                        </div>
                        <p className="text-2xl font-semibold">{analytics.total}</p>
                        <p className="text-xs text-muted-foreground">
                            {analytics.done} done · {analytics.inProgress} in progress
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Completion
                        </div>
                        <p className="text-2xl font-semibold">{analytics.completion}%</p>
                        <Progress value={analytics.completion} className="h-1.5 mt-1" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Clock className="h-3.5 w-3.5" /> Logged hours
                        </div>
                        <p className="text-2xl font-semibold">{analytics.loggedHours.toFixed(1)}h</p>
                        <p className="text-xs text-muted-foreground">
                            of {analytics.estimatedHours.toFixed(1)}h estimated
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <TrendingUp className="h-3.5 w-3.5" /> Cost
                        </div>
                        <p className="text-2xl font-semibold">PKR {Math.round(analytics.totalCostPkr).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{analytics.billableHours.toFixed(1)}h billable</p>
                    </CardContent>
                </Card>
            </div>

            {/* Status Breakdown + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Task status breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            { label: "To Do", value: analytics.todo, status: "todo" as TaskStatus },
                            { label: "In Progress", value: analytics.inProgress, status: "in_progress" as TaskStatus },
                            { label: "In Review", value: analytics.inReview, status: "in_review" as TaskStatus },
                            { label: "Done", value: analytics.done, status: "done" as TaskStatus },
                        ].map((row) => {
                            const pct = analytics.total ? (row.value / analytics.total) * 100 : 0;
                            return (
                                <div key={row.label} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className={`${statusColors[row.status]} text-[10px] px-1.5 py-0`}>
                                                {row.label}
                                            </Badge>
                                            <span className="text-muted-foreground">{row.value} tasks</span>
                                        </div>
                                        <span className="text-muted-foreground">{Math.round(pct)}%</span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Start</p>
                                <p>{project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">End</p>
                                <p>{project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Members</p>
                                <p>{members.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Members Section */}
            <Card>
                <CardHeader className="pb-3 flex justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-sm font-medium">Members</CardTitle>
                    </div>
                    <div>
                        <Button variant="outline" size="sm" className="">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add member
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {members.map((m) => {
                        const s = memberStats(m.id);
                        return (
                            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {m.name.split(" ").map((n) => n[0]).join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">{m.name}</p>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{m.role}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                </div>
                                <div className="hidden sm:block w-40">
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                        <span>{s.done}/{s.total} tasks</span>
                                        <span>{s.completion}%</span>
                                    </div>
                                    <Progress value={s.completion} className="h-1.5" />
                                </div>
                                <div className="hidden md:block text-right text-xs text-muted-foreground w-20">
                                    {s.hours.toFixed(1)}h logged
                                </div>
                            </div>
                        );
                    })}

                    {members.length === 0 && (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No members assigned to this project yet.
                        </p>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}