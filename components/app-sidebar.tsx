"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Settings2Icon, Circle, LayoutDashboardIcon, Users, Users2, Folder, UserIcon } from "lucide-react"
import { WorkspaceSwitcher } from "./workspace/WorkspaceSwitcher"
import { User } from "@/app/types"
import { AppSidebarProps } from "@/app/interface"
import { transformTeams, transformUsers } from "@/app/lib/utils"
import { prisma } from "@/app/lib/prisma"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: (
        <LayoutDashboardIcon
        />
      )
    },
    {
      title: "Team Members",
      url: "/dashboard/team",
      icon: (
        <Users
        />
      )
    },
    {
      title: "Teams",
      url: "#",
      icon: (
        <Users2
        />
      )
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: (
        <Folder
        />
      )
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: (
        <UserIcon
        />
      )
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: (
        <Settings2Icon
        />
      )
    },
  ],

}


export function AppSidebar({ projects, workspaces, activeWorkspace,user, ...props }: AppSidebarProps) {

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
    items: [
      {
        title: "Tasks",
        url: `/dashboard/projects/tasks/${p.id}`,
      },
      {
        title: "Campaigns",
        url: `/dashboard/projects/${p.id}/campaigns`,
      },
      {
        title: "Landing Pages",
        url: `/dashboard/projects/${p.id}/landing-pages`,
      },
      {
        title: "Worksheets",
        url: `/dashboard/projects/${p.id}/worksheets`,
      },
      {
        title: "Time Tracking",
        url: `/dashboard/projects/time-tracking`,
      },
    ]
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={projectItems}/>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
