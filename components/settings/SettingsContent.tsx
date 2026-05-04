"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { updateWorkspace } from "@/app/lib/actions/workspace"
import { updateProfile } from "@/app/lib/actions/profile"
import { Role, User } from "@/app/types"
import { Check, Shield } from "lucide-react"

interface SettingsContentProps {
  user: User
  activeWorkspace: any
  members: any[]
}

export function SettingsContent({ user, activeWorkspace, members }: SettingsContentProps) {
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || "")
  const [workspaceDescription, setWorkspaceDescription] = useState(activeWorkspace?.description || "")
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false)

  const [displayName, setDisplayName] = useState(user.name || "")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const isManagerOrAdmin = user.role === Role.ADMIN || user.role === Role.MANAGER
  const isOwner = activeWorkspace?.userId === user.id

  const handleUpdateWorkspace = async () => {
    if (!activeWorkspace) return
    setIsUpdatingWorkspace(true)
    try {
      const result = await updateWorkspace(activeWorkspace.id, workspaceName, workspaceDescription)
      if (result.success) {
        toast.success("Workspace updated successfully")
      } else {
        toast.error(result.error || "Failed to update workspace")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsUpdatingWorkspace(false)
    }
  }

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true)
    try {
      const formData = new FormData()
      formData.append("name", displayName)
      
      const result = await updateProfile(formData)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getRoleBadge = (role: string, isOwner: boolean = false) => {
    if (isOwner) return <Badge className="bg-[#EEF2FF] text-[#4338CA] hover:bg-[#EEF2FF] border-none px-3 py-0.5 rounded-full text-[11px] font-bold lowercase">owner</Badge>
    
    switch (role) {
      case Role.ADMIN:
        return <Badge className="bg-[#FEF3C7] text-[#D97706] hover:bg-[#FEF3C7] border-none px-3 py-0.5 rounded-full text-[11px] font-bold lowercase">admin</Badge>
      case Role.MANAGER:
        return <Badge className="bg-[#F3F4F6] text-[#1F2937] hover:bg-[#F3F4F6] border-none px-3 py-0.5 rounded-full text-[11px] font-bold lowercase">manager</Badge>
      case Role.USER:
        return <Badge className="bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F9FAFB] border-none px-3 py-0.5 rounded-full text-[11px] font-bold lowercase">member</Badge>
      case Role.GUEST:
        return <Badge className="bg-[#F9FAFB] text-[#9CA3AF] hover:bg-[#F9FAFB] border-none px-3 py-0.5 rounded-full text-[11px] font-bold lowercase">viewer</Badge>
      default:
        return <Badge className="bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F9FAFB] border-none px-3 py-0.5 rounded-full text-[11px] font-bold lowercase">{role.toLowerCase()}</Badge>
    }
  }

  const permissions = [
    { name: "View projects", roles: ["admin", "manager", "member", "viewer", "guest"] },
    { name: "Create projects", roles: [ "admin", "manager", "member"] },
    { name: "Edit projects", roles: ["admin", "manager", "member"] },
    { name: "Delete projects", roles: ["admin"] },
    { name: "Manage tasks", roles: ["admin", "manager", "member"] },
    { name: "Log time", roles: ["admin", "manager", "member"] },
    { name: "View reports", roles: ["admin", "manager", "member", "viewer"] },
    { name: "Invite members", roles: ["admin", "manager"] },
    { name: "Manage roles", roles: ["admin"] },
    { name: "Workspace settings", roles: ["admin"] },
    // { name: "Billing & plans", roles: ["owner"] },
  ]

  const permissionRoles = ["Owner", "Admin", "Manager", "Member", "Viewer", "Guest"]

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      {/* Workspace Section */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Workspace Name</label>
            <Input 
              value={workspaceName} 
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="bg-white border-gray-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Description</label>
            <Textarea 
              value={workspaceDescription} 
              onChange={(e) => setWorkspaceDescription(e.target.value)}
              rows={4}
              className="bg-white border-gray-200 resize-none"
            />
          </div>
          <Button 
            onClick={handleUpdateWorkspace} 
            disabled={!isManagerOrAdmin && !isOwner || isUpdatingWorkspace}
            className="font-bold px-6 py-2 rounded-md transition-colors"
          >
            {isUpdatingWorkspace ? "Saving..." : "Save Workspace"}
          </Button>
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 py-2">
            <Avatar className="h-16 w-16 bg-blue-50 border border-blue-100">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-primary text-xl font-bold">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" className="font-bold text-gray-700 border-gray-300">Change avatar</Button>
          </div>
          
          <div className="space-y-6 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Display name</label>
              <Input 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-white border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Email</label>
              <Input value={user.email} disabled className="bg-gray-50 border-gray-200 text-gray-400" />
              <p className="text-xs text-gray-400">Email cannot be changed</p>
            </div>
            <Button 
              onClick={handleUpdateProfile} 
              disabled={isUpdatingProfile}
              className="font-bold px-6 py-2 rounded-md transition-colors"
            >
              {isUpdatingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Section */}
      {/* 
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">Members</CardTitle>
          <Button variant="outline" size="sm" className="flex items-center gap-2 font-bold text-gray-700 border-gray-300">
            <span>+ Invite</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-blue-50 border border-blue-50">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-[#2563EB] font-bold text-sm">{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-900">{member.name}</span>
                    <span className="text-xs text-gray-400 font-medium">{member.email}</span>
                  </div>
                </div>
                <div>
                  {getRoleBadge(member.role, member.id === activeWorkspace?.userId)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      */}

      {/* Permissions Section */}
      {/* 
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-[#2563EB]" />
            <CardTitle className="text-base font-bold">Permissions</CardTitle>
          </div>
          <CardDescription className="text-xs font-medium text-gray-500">
            Role-based access control for this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 border-t border-gray-100">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="w-[200px] font-bold text-[11px] uppercase text-gray-400 py-4 px-6">Permission</TableHead>
                  {permissionRoles.map((role) => (
                    <TableHead key={role} className="text-center font-bold text-[11px] uppercase text-gray-400 py-4">
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((p) => (
                  <TableRow key={p.name} className="hover:bg-gray-50/30 border-b border-gray-100 last:border-0">
                    <TableCell className="font-bold text-sm text-gray-700 py-5 px-6">{p.name}</TableCell>
                    {permissionRoles.map((role) => (
                      <TableCell key={role} className="text-center py-5">
                        {p.roles.includes(role.toLowerCase()) ? (
                          <Check className="h-4 w-4 text-[#2563EB] mx-auto stroke-[3]" />
                        ) : (
                          <span className="text-gray-200 text-xs font-bold">✕</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      */}
    </div>
  )
}
