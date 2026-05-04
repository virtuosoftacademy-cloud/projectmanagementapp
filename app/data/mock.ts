import { User, Team, Workspace, Project, Task, TimeEntry, Activity } from "@/app/types";

export const Teams: Team[] = [
    { id: "tm1", name: "Engineering", members: [] },
    { id: "tm2", name: "Design Studio", members: [] },
];

export const mockUsers: User[] = [
    { id: "u2", name: "Sarah Kim", email: "sarah@company.com", role: "admin", teamId: "tm1", hourlyRatePkr: 600, monthlyHours: 160 },
    { id: "u3", name: "Mike Johnson", email: "mike@company.com", role: "member", teamId: "tm1", hourlyRatePkr: 500, monthlyHours: 160 },
    { id: "u4", name: "Emma Wilson", email: "emma@company.com", role: "manager", teamId: "tm2", hourlyRatePkr: 550, monthlyHours: 160 },
    { id: "u6", name: "Client User", email: "client@external.com", role: "guest", teamId: "tm1" },
];

export const mockWorkspaces: Workspace[] = [
    { id: "w1", name: "Acme Corp", slug: "acme", description: "Main workspace for all projects", members: mockUsers },
    { id: "w2", name: "Side Project", slug: "side-project", description: "Personal side projects", members: [mockUsers[0], mockUsers[2]] },
];

export const mockProjects: Project[] = [
    { id: "p1", workspaceId: "w1", name: "Website Redesign", description: "Redesign the company website with a modern look", color: "hsl(220, 80%, 56%)", members: ["u1", "u2", "u3"], status: "active", startDate: "2026-01-15", endDate: "2026-04-15", createdAt: "2026-01-15" },
    { id: "p2", workspaceId: "w1", name: "Mobile App", description: "Build the iOS and Android companion app", color: "hsl(142, 71%, 45%)", members: ["u1", "u3", "u4"], status: "planning", startDate: "2026-01-20", endDate: "2026-06-30", createdAt: "2026-01-20" },
    { id: "p3", workspaceId: "w1", name: "API v2", description: "Next generation API with GraphQL support", color: "hsl(38, 92%, 50%)", members: ["u2", "u3"], status: "active", startDate: "2026-02-01", endDate: "2026-05-01", createdAt: "2026-02-01" },
];

export const mockTasks: Task[] = [
    { id: "t1", projectId: "p1", title: "Develop Landing Page", description: "Full landing page development", status: "in_progress", priority: "high", assigneeIds: ["u2", "u3"], dueDate: "2026-02-28", estimatedEffortMinutes: 960, isBillable: true, createdAt: "2026-01-16", labels: ["design", "frontend"] },
    { id: "t1-1", projectId: "p1", parentTaskId: "t1", title: "Wireframe", description: "Create wireframe for landing page", status: "done", priority: "high", assigneeIds: ["u2"], dueDate: "2026-02-10", estimatedEffortMinutes: 120, isBillable: true, createdAt: "2026-01-16", labels: ["design"] },
    { id: "t1-2", projectId: "p1", parentTaskId: "t1", title: "Visual Design", description: "High-fidelity design mockup", status: "done", priority: "high", assigneeIds: ["u2"], dueDate: "2026-02-15", estimatedEffortMinutes: 240, isBillable: true, createdAt: "2026-01-17", labels: ["design"] },
    { id: "t1-3", projectId: "p1", parentTaskId: "t1", title: "Write Copy", description: "Write all landing page copy", status: "in_progress", priority: "medium", assigneeIds: ["u4"], dueDate: "2026-02-18", estimatedEffortMinutes: 120, isBillable: true, createdAt: "2026-01-18", labels: ["content"] },
    { id: "t1-4", projectId: "p1", parentTaskId: "t1", title: "Frontend Development", description: "Build the landing page components", status: "todo", priority: "high", assigneeIds: ["u3"], dueDate: "2026-02-25", estimatedEffortMinutes: 360, isBillable: true, createdAt: "2026-01-19", labels: ["frontend"] },
    { id: "t1-5", projectId: "p1", parentTaskId: "t1", title: "Go Live", description: "Deploy landing page to production", status: "todo", priority: "medium", assigneeIds: ["u1"], dueDate: "2026-02-28", estimatedEffortMinutes: 60, isBillable: false, createdAt: "2026-01-20", labels: ["devops"] },
    { id: "t2", projectId: "p1", title: "Set up CI/CD pipeline", description: "Configure GitHub Actions for automated deployment", status: "todo", priority: "high", assigneeIds: ["u1"], dueDate: "2026-02-25", estimatedEffortMinutes: 180, isBillable: false, createdAt: "2026-01-20", labels: ["devops"] },
    { id: "t3", projectId: "p1", title: "Footer component", description: "Build the site footer with links", status: "todo", priority: "low", assigneeIds: ["u3"], estimatedEffortMinutes: 90, isBillable: true, createdAt: "2026-02-05", labels: ["frontend"] },
    { id: "t4", projectId: "p2", title: "User authentication flow", description: "Implement login, register, and forgot password screens", status: "in_progress", priority: "urgent", assigneeIds: ["u1", "u3"], dueDate: "2026-02-18", estimatedEffortMinutes: 480, isBillable: true, createdAt: "2026-01-22", labels: ["auth"] },
    { id: "t5", projectId: "p2", title: "Push notifications", description: "Set up push notification service", status: "todo", priority: "medium", assigneeIds: ["u4"], dueDate: "2026-03-01", estimatedEffortMinutes: 240, isBillable: true, createdAt: "2026-01-25", labels: ["backend"] },
    { id: "t6", projectId: "p2", title: "Onboarding screens", description: "Design and implement onboarding flow", status: "todo", priority: "medium", assigneeIds: ["u2", "u4"], dueDate: "2026-03-05", estimatedEffortMinutes: 300, isBillable: true, createdAt: "2026-02-08", labels: ["design", "frontend"] },
    { id: "t7", projectId: "p3", title: "Schema design", description: "Design the GraphQL schema for API v2", status: "in_review", priority: "high", assigneeIds: ["u2"], dueDate: "2026-02-15", estimatedEffortMinutes: 240, isBillable: true, createdAt: "2026-02-02", labels: ["backend"] },
];

export const mockTimeEntries: TimeEntry[] = [
    { id: "te1", taskId: "t1-1", userId: "u2", date: "2026-02-10", duration: 120, notes: "Finished wireframe" },
    { id: "te2", taskId: "t1-2", userId: "u2", date: "2026-02-14", duration: 180, notes: "Visual design WIP" },
    { id: "te3", taskId: "t4", userId: "u1", date: "2026-02-12", duration: 240, notes: "Auth flow implementation" },
    { id: "te4", taskId: "t7", userId: "u2", date: "2026-02-13", duration: 90, notes: "Schema review session" },
    { id: "te5", taskId: "t1-3", userId: "u4", date: "2026-02-14", duration: 150, notes: "Drafting copy" },
    { id: "te6", taskId: "t4", userId: "u1", date: "2026-02-15", duration: 200, notes: "OAuth integration" },
    { id: "te7", taskId: "t1-2", userId: "u2", date: "2026-02-16", duration: 60, notes: "Final design revisions" },
    { id: "te8", taskId: "t2", userId: "u1", date: "2026-02-17", duration: 120, notes: "Pipeline setup" },
];

export const mockActivities: Activity[] = [
    { id: "a1", userId: "u1", action: "created task", target: "Set up CI/CD pipeline", createdAt: "2026-02-17T14:30:00" },
    { id: "a2", userId: "u2", action: "completed task", target: "Visual Design", createdAt: "2026-02-17T12:00:00" },
    { id: "a3", userId: "u4", action: "logged 2.5h on", target: "Write Copy", createdAt: "2026-02-17T10:15:00" },
    { id: "a4", userId: "u1", action: "moved to In Review", target: "Schema design", createdAt: "2026-02-16T16:45:00" },
    { id: "a5", userId: "u4", action: "commented on", target: "Push notifications", createdAt: "2026-02-16T15:00:00" },
];

export const currentUser = mockUsers[0];
