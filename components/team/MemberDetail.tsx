"use client"

import { Role } from "@/app/types"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  MailIcon, 
  DollarSignIcon, 
  ClockIcon, 
  CheckCircle2Icon, 
  MessageSquareIcon, 
  SendIcon, 
  LayoutGridIcon, 
  ClipboardListIcon,
  TrendingUpIcon,
  UsersIcon
} from "lucide-react"
import { useState } from "react"

interface MemberDetailProps {
  member: any 
  isOpen: boolean
  onClose: () => void
}

export function MemberDetail({ member, isOpen, onClose }: MemberDetailProps) {
  const [note, setNote] = useState("")

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const mockNotes = [
    { id: 1, author: "Sarah", content: "Great work on the landing page this sprint!", date: "2 days ago" },
    { id: 2, author: "Alex", content: "Please review the CI/CD pipeline PR when you get a chance.", date: "4 days ago" }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-white z-10 p-6 pb-4 flex items-start justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 bg-primary/10 border border-primary/10">
              <AvatarImage src={member.avatar || undefined} />
              <AvatarFallback className="text-primary font-bold text-xl">{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-gray-900">{member.name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-none font-bold text-[10px] lowercase px-2">
                  {member.role.toLowerCase()}
                </Badge>
                {member.team && (
                  <Badge variant="outline" className="text-gray-500 border-gray-200 font-bold text-[10px] flex items-center gap-1 px-2 py-0.5">
                    <UsersIcon className="size-3" />
                    {member.team.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-500 font-medium">
            <div className="flex items-center gap-2">
              <MailIcon className="size-4 text-gray-400" />
              {member.email}
            </div>
            <div className="flex items-center gap-2">
              <DollarSignIcon className="size-4 text-gray-400" />
              PKR {member.hourlyRate || 0}/hr
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="size-4 text-gray-400" />
              {member.monthlyHours || 0}h/month
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50/50 rounded-2xl p-4 text-center space-y-1 border border-gray-100/50">
              <div className="text-2xl font-bold text-gray-900">{member.projectsCount || 0}</div>
              <div className="text-[11px] font-bold text-gray-400">Projects</div>
            </div>
            <div className="bg-gray-50/50 rounded-2xl p-4 text-center space-y-1 border border-gray-100/50">
              <div className="text-2xl font-bold text-gray-900">{member.tasksCount || 0}</div>
              <div className="text-[11px] font-bold text-gray-400">Tasks</div>
            </div>
            <div className="bg-gray-50/50 rounded-2xl p-4 text-center space-y-1 border border-gray-100/50">
              <div className="text-2xl font-bold text-gray-900">0h</div>
              <div className="text-[11px] font-bold text-gray-400">Logged</div>
            </div>
            <div className="bg-gray-50/50 rounded-2xl p-4 text-center space-y-1 border border-gray-100/50">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-[11px] font-bold text-gray-400">Completed</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-bold text-gray-700">
                <TrendingUpIcon className="size-4 text-gray-400" />
                Utilization
              </div>
              <span className="font-bold text-gray-900">0%</span>
            </div>
            <Progress value={0} className="h-2 bg-gray-100" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-gray-700">
              <LayoutGridIcon className="size-4 text-gray-400" />
              Assigned Projects
            </div>
            <div className="text-sm">
              {member.assignedProjects?.length > 0 ? (
                <div className="grid gap-2">
                    {member.assignedProjects.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50/30 rounded-xl border border-gray-100/50">
                        <div className="flex items-center gap-3">
                          <div className="size-2 rounded-full" style={{ backgroundColor: p.color || "#3b82f6" }} />
                          <span className="font-bold text-gray-900">{p.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold border-gray-200 text-gray-400 px-2">
                          {p.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : <p className="text-gray-400 font-medium">No projects assigned</p>}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2 font-bold text-gray-700">
              <ClipboardListIcon className="size-4 text-gray-400" />
              Current Tasks
            </div>
            <div className="text-sm">
              {member.currentTasks?.length > 0 ? (
                <div className="grid gap-2">
                    {member.currentTasks.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50/30 rounded-xl border border-gray-100/50">
                        <div className="flex items-center gap-3">
                          <CheckCircle2Icon className="size-4 text-gray-300" />
                          <span className="font-bold text-gray-900">{t.title}</span>
                        </div>
                        {t.priority && (
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 ${
                            t.priority === "HIGH" ? "text-orange-500 border-orange-100" : "text-blue-500 border-blue-100"
                          }`}>
                            {t.priority}
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              ) : <p className="text-gray-400 font-medium">No active tasks</p>}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2 font-bold text-gray-700">
              <ClockIcon className="size-4 text-gray-400" />
              Recent Time Entries
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50/30 rounded-xl border border-gray-100/50 text-sm">
                <div className="text-gray-900 font-medium">No recent entries</div>
                <div className="text-gray-400 font-bold">0.0h</div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-50 pb-8">
            <div className="flex items-center gap-2 font-bold text-gray-700">
              <MessageSquareIcon className="size-4 text-gray-400" />
              Notes
            </div>
            
            <div className="relative group">
              <Textarea 
                placeholder="Add a note..." 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[100px] border-blue-100 bg-white shadow-sm focus-visible:ring-blue-100 rounded-xl resize-none pr-12"
              />
              <Button 
                size="icon" 
                className="absolute bottom-3 right-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border-none"
                disabled={!note.trim()}
              >
                <SendIcon className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {mockNotes.map((n) => (
                <div key={n.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 bg-gray-50">
                    <AvatarFallback className="text-[10px] font-bold text-gray-400">{getInitials(n.author)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-gray-50/50 rounded-2xl rounded-tl-none p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">{n.author}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{n.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
