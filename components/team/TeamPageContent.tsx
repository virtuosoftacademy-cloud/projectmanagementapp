"use client"

import { useState } from "react"
import { Role, User } from "@/app/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, SearchIcon, FilterIcon, UsersIcon } from "lucide-react"
import { MemberDetail } from "./MemberDetail"
import { InviteMember } from "./InviteMember"

interface TeamPageContentProps {
  initialMembers: User[]
  teams: any[]
  activeWorkspace?: any
}

export function TeamPageContent({ initialMembers, teams, activeWorkspace }: TeamPageContentProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const filteredMembers = initialMembers.filter(member => {
    const matchesTeam = selectedTeam === "all" || member.teamId === selectedTeam
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTeam && matchesSearch
  })

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

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredMembers.length} members in {selectedTeam === "all" ? "this workspace" : teams.find(t => t.id === selectedTeam)?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[180px] bg-white border-gray-200 font-medium">
              <SelectValue placeholder="Filter by Team" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-primary hover:opacity-90 text-primary-foreground font-bold flex items-center gap-2"
          >
            <PlusIcon className="size-4" />
            Invite Member
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {filteredMembers.map((member) => (
          <div 
            key={member.id} 
            onClick={() => setSelectedMember(member)}
            className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 bg-primary/10 border border-primary/10 transition-transform group-hover:scale-105">
                <AvatarImage src={member.avatar || undefined} />
                <AvatarFallback className="text-primary font-bold text-base">{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[15px] text-gray-900">{member.name}</span>
                  {member.team && (
                    <Badge variant="outline" className="text-[10px] font-bold text-gray-400 border-gray-100 py-0 h-4">
                      {member.team.name}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-gray-400 font-medium">{member.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {getRoleBadge(member.role, member.id === activeWorkspace?.userId)}
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center">
            <UsersIcon className="h-8 w-8 text-gray-300" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">No members found</h3>
            <p className="text-sm text-gray-500">Try adjusting your filter or search query</p>
          </div>
        </div>
      )}

      {selectedMember && (
        <MemberDetail 
          member={selectedMember} 
          isOpen={!!selectedMember} 
          onClose={() => setSelectedMember(null)} 
        />
      )}

      <InviteMember 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)}
        teams={teams}
      />
    </div>
  )
}
