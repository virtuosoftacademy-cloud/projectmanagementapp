import { Sidebar } from "@/components/ui/sidebar";
import { Team, User } from "../types";

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  teams:Team[]
  user: User
  users: User[]
  projects: any[]
  workspaces: any[]
  activeWorkspace: any
}

export interface Project {
  name: string;
  url: string;
  icon: React.ReactNode
  isActive?: boolean
  teams:Team[]
  items?: {
    title: string
    url: string
  }[];
}


export interface NavProjectsProps {
  projects: Project[];
  activeWorkspace: any;
  teamMembers?: any[];
}


export interface ProjectListProps {
  projects: any[]
  teamMembers: any[]
}

// Admin dashboard props
export interface AdminDashboardProps {
    users: User[],
    teams: Team[],
    currentUser: User,
}

export interface DeleteAlertDialogProps {
    userId: string;
    userName?: string;
}