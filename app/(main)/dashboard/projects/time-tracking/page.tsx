'use client';
import { useState } from "react";
import { mockTimeEntries, mockTasks, mockProjects, mockUsers, currentUser } from "@/app/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ActiveTimer } from "@/components/time-tracking/AcitveTimer";
import { VarianceBadge, getVarianceColor } from "@/components/time-tracking/VarianceBadge";
import { formatMinutes } from "@/hooks/useTimer";
import { Role, TimeEntry } from "@/app/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getWeeklyData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => ({
    day,
    hours: Math.round((mockTimeEntries[i % mockTimeEntries.length]?.duration || 0) / 60 * 10) / 10 + Math.random() * 2,
  }));
}

/** Per-user variance summary for all tasks */
function getUserVarianceSummary() {
  return mockUsers
    .filter((u) => u.role !== Role.GUEST)
    .map((user) => {
      const userTasks = mockTasks.filter((t) => t.assigneeIds.includes(user.id));
      const estimatedMinutes = userTasks.reduce(
        (sum, t) => sum + (t.estimatedEffortMinutes || 0) / t.assigneeIds.length,
        0
      );
      const actualMinutes = mockTimeEntries
        .filter((te) => te.userId === user.id)
        .reduce((sum, te) => sum + te.duration, 0);
      return { user, estimatedMinutes: Math.round(estimatedMinutes), actualMinutes, taskCount: userTasks.length };
    })
    .filter((s) => s.taskCount > 0);
}

export default function TimeTracking() {
  const weeklyData = getWeeklyData();
  const userSummary = getUserVarianceSummary();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(mockTimeEntries);
  const [logOpen, setLogOpen] = useState(false);
  const [logTaskId, setLogTaskId] = useState("");
  const [logDuration, setLogDuration] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState("");

  const handleTimerStop = (taskId: string, durationSeconds: number, pausedTimes: { start: string; end: string }[]) => {
    const newEntry: TimeEntry = {
      id: `te${Date.now()}`,
      taskId,
      userId: currentUser.id,
      date: new Date().toISOString().slice(0, 10),
      duration: Math.ceil(durationSeconds / 60),
      notes: "Timer entry",
      pausedTimes,
    };
    setTimeEntries((prev) => [newEntry, ...prev]);
  };

  return (
    <div className="space-y-6 px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and review your team's time</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4" /> Log Time
        </Button>
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
            <DialogDescription>Record time spent on a task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="log-task">Task</Label>
              <Select value={logTaskId} onValueChange={setLogTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                {/* <SelectContent>
                  {mockTasks.filter(t => !t.parentTaskId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent> */}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="log-duration">Duration (minutes)</Label>
                <Input id="log-duration" type="number" placeholder="60" value={logDuration} onChange={(e) => setLogDuration(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="log-date">Date</Label>
                <Input id="log-date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="log-notes">Notes</Label>
              <Input id="log-notes" placeholder="What did you work on?" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={() => setLogOpen(false)}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Timer */}
      <ActiveTimer onStop={handleTimerStop} />

      {/* Per-user variance summary */}
      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Per-User Variance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {userSummary.map(({ user, estimatedMinutes, actualMinutes }) => {
            const progress = estimatedMinutes > 0 ? Math.min((actualMinutes / estimatedMinutes) * 100, 150) : 0;
            return (
              <div key={user.id} className="flex items-center gap-3">
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarFallback className="text-[10px] bg-muted">{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{user.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatMinutes(actualMinutes)} / {formatMinutes(estimatedMinutes)}
                      </span>
                      <VarianceBadge estimatedMinutes={estimatedMinutes} actualMinutes={actualMinutes} />
                    </div>
                  </div>
                  <Progress
                    value={Math.min(progress, 100)}
                    className="h-1.5"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Weekly chart */}
      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, i) => (
                    <Cell key={i} fill={entry.hours > 8 ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Time logs table */}
      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Time Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.map((entry) => {
                const task = mockTasks.find((t) => t.id === entry.taskId);
                const project = task ? mockProjects.find((p) => p.id === task.projectId) : null;
                const user = mockUsers.find((u) => u.id === entry.userId);
                const perUserEstimate = task && task.estimatedEffortMinutes
                  ? Math.round(task.estimatedEffortMinutes / task.assigneeIds.length)
                  : 0;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      {user && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5 border border-border">
                            <AvatarFallback className="text-[9px] bg-muted">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name.split(" ")[0]}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{task?.title || "—"}</TableCell>
                    <TableCell>
                      {project && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                          <span className="text-sm text-muted-foreground">{project.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{Math.floor(entry.duration / 60)}h {entry.duration % 60}m</TableCell>
                    <TableCell>
                      {perUserEstimate > 0 && (
                        <VarianceBadge estimatedMinutes={perUserEstimate} actualMinutes={entry.duration} showLabel={false} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{entry.notes}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
