"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { CheckSquare, CalendarDays } from "lucide-react"
import { Team } from "@/app/types"

interface ProjectCardProps {
  project: any
  teamMembers: Team[]
}

export function ProjectCard({ project, teamMembers }: ProjectCardProps) {
  const fallbackColor = project.status === "ACTIVE" ? "var(--primary)" : project.status === "COMPLETED" ? "#16a34a" : "#eab308";
  let projectColor = project.color || fallbackColor;
  if (projectColor === "#3b82f6") projectColor = "var(--primary)";
  
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((t: any) => t.status === "DONE").length || 0;

  return (
    <Link href={`/dashboard/projects/${project.id}`} className="group block">
      <Card className="p-6 border border-gray-100 shadow-none hover:shadow-lg transition-all duration-300 rounded-xl bg-white relative">
        <div className="absolute top-6 right-6">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-3 py-0.5 rounded-full text-[11px] font-bold lowercase">
            {project.status.toLowerCase()}
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="h-2.5 w-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: projectColor }} 
            />
            <h3 className="text-base font-black text-gray-900 line-clamp-1">{project.name}</h3>
          </div>

          <p className="text-[13px] text-gray-400 line-clamp-2 leading-relaxed">
            {project.description || "No description provided for this project."}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-1">
            <div className="flex items-center gap-2 text-gray-400">
              <CheckSquare className="h-4 w-4" />
              <span className="text-[11px] font-bold tracking-tight">{completedTasks}/{totalTasks} tasks</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-gray-400">
              <CalendarDays className="h-4 w-4" />
              <span className="text-[11px] font-bold tracking-tight">
                {project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "--"}
              </span>
            </div>
          </div>

          <div className="flex -space-x-1.5 pt-1">
            {teamMembers.slice(0, 3).map((member, i) => (
              <Avatar key={member.id} className="h-6 w-6 border-2 border-white ring-1 ring-gray-100">
                <AvatarImage src={member.avatar || ""} />
                <AvatarFallback className="bg-gray-100 text-[8px] font-black">{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  )
}
