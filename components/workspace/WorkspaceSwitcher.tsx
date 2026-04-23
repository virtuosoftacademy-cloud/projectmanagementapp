"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { ChevronsUpDown, Command, Plus } from "lucide-react"
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog"
import { setActiveWorkspace } from "@/app/lib/actions/workspace"

interface WorkspaceSwitcherProps {
  workspaces: any[]
  activeWorkspace: any
}

export function WorkspaceSwitcher({ workspaces, activeWorkspace }: WorkspaceSwitcherProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[slot=sidebar-menu-button]:p-1.5! hover:bg-sidebar-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <Command className="size-5!" />
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <span className="truncate text-base font-semibold leading-none">
                  {activeWorkspace?.name || "Select Workspace"}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </div>
            </div>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-lg"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => setActiveWorkspace(workspace.id)}
              className="gap-2 p-2 focus:bg-blue-50 focus:text-blue-700 transition-colors"
            >
              <div className="flex size-6 items-center justify-center rounded-sm border bg-muted/50">
                <Command className="size-3 shrink-0" />
              </div>
              <span className="flex-1 truncate">{workspace.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 p-2 cursor-pointer font-medium text-blue-600 hover:text-blue-700 focus:text-blue-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <div className="flex size-6 items-center justify-center rounded-md border border-blue-100 bg-blue-50">
              <Plus className="size-4" />
            </div>
            <span>Add Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  )
}
