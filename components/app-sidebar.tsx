"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, ListIcon, ChartBarIcon, FolderIcon, UsersIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, CommandIcon, CheckSquare, Megaphone, PanelTop, Sheet, Clock, BarChart3, CalendarDays, Settings } from "lucide-react"
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
      url: "#",
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
    {
      name: "Settings",
      url: "#",
      icon: (
        <Settings
        />
      ),
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User
}
export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.projects} />
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
