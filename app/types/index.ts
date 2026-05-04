

export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  USER = "USER",
  GUEST = "GUEST"
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: Role;
  teamId?: string;
  team?: Team;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  code: string;
  members: User[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Credentials {
  name: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  login: (formdata: FormData) => void;
  logout: () => void;
  hasPermission: (requiredRole: Role) => boolean;
}
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  startDate?: string;
  dueDate?: string;
  estimatedEffortMinutes?: number;
  //   isBillable: boolean;
  createdAt: string;
  labels: string[];
}

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low" | "none";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";


export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  members: User[];
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface ProjectDetailClientProps {
  initialTasks: Task[];
  teams: Team[];
  users:User[];
  project: Project;
  projectId: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  date: string;
  duration: number; // minutes
  notes: string;
  pausedTimes?: { start: string; end: string }[];
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  target: string;
  createdAt: string;
}

type ActiveWorkspace = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  users: User[];
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;

}

export type ProjectProps = {
  activeWorkspace: ActiveWorkspace;
  projects: any[];
  teams: Team[];
  users: User[];
  userId: string;
};
