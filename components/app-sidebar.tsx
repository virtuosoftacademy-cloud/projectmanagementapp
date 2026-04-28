"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, ListIcon, ChartBarIcon, FolderIcon, UsersIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, CommandIcon, CheckSquare, Megaphone, PanelTop, Sheet, Clock, BarChart3, CalendarDays, Settings, Circle } from "lucide-react"
import { Role, User } from "@/app/types"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <LayoutDashboardIcon
        />
      ),
    },
    {
      title: "Analytics",
      url: "#",
      icon: (
        <ChartBarIcon
        />
      ),
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: (
        <FolderIcon
        />
      ),
    },
    {
      title: "Team",
      url: "/dashboard/team",
      // isActive:Role.MANAGER,
      icon: (
        <UsersIcon
        />
      ),
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      // isActive:Role.MANAGER,
      icon: (
        <UsersIcon
        />
      ),
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: (
        <Settings
        />
      ),
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: (
        <CameraIcon
        />
      ),
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: (
        <FileTextIcon
        />
      ),
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: (
        <FileTextIcon
        />
      ),
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  // navSecondary: [
  //   {
  //     title: "Settings",
  //     url: "#",
  //     icon: (
  //       <Settings2Icon
  //       />
  //     ),
  //   },
  //   {
  //     title: "Get Help",
  //     url: "#",
  //     icon: (
  //       <CircleHelpIcon
  //       />
  //     ),
  //   },
  //   {
  //     title: "Search",
  //     url: "#",
  //     icon: (
  //       <SearchIcon
  //       />
  //     ),
  //   },
  // ],
  projects: [
    {
      name: "Tasks",
      url: "#",
      icon: (
        <CheckSquare
        />
      ),
    },

    {
      name: "Campaigns",
      url: "#",
      icon: (
        <Megaphone
        />
      ),
    },
    {
      name: "Landing Pages",
      url: "#",
      icon: (
        <PanelTop
        />
      ),
    },

    {
      name: "Timesheet",
      url: "#",
      icon: (
        <Sheet
        />
      ),
    },

    {
      name: "Time Tracking",
      url: "#",
      icon: (
        <Clock
        />
      ),
    },

    {
      name: "Analytics",
      url: "#",
      icon: (
        <BarChart3
        />
      ),
    },

    {
      name: "Calendar",
      url: "#",
      icon: (
        <CalendarDays
        />
      ),
    },


    {
      name: "Reports",
      url: "#",
      icon: (
        <FileChartColumnIcon
        />
      ),
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User
  projects: any[]
  workspaces: any[]
  activeWorkspace: any
}
export function AppSidebar({ user, projects, workspaces, activeWorkspace, ...props }: AppSidebarProps) {
  const projectItems = projects.map((p) => ({
    name: p.name,
    url: `/dashboard/projects/${p.id}`,
    icon: (
      <Circle
        className={`size-2.5 fill-current ${p.status === "ACTIVE"
            ? "text-primary"
            : p.status === "COMPLETED"
              ? "text-emerald-500"
              : "text-amber-500"
          }`}
      />
    ),
  }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher 
          workspaces={workspaces} 
          activeWorkspace={activeWorkspace} 
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={projectItems} />
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
