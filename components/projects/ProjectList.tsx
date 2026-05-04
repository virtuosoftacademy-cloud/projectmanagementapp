"use client"

import { ProjectCard } from "./ProjectCard"
import { FolderPlus } from "lucide-react"
import { ProjectListProps } from "@/app/interface";

export function ProjectList({ projects, teamMembers }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-white/50 rounded-2xl border-2 border-dashed border-gray-100 mt-8">
        <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
          <FolderPlus className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No projects found</h3>
        <p className="text-gray-500 text-center max-w-sm">
          You haven&apos;t been assigned to any projects yet. Start by creating your first workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          teamMembers={teamMembers}
        />
      ))}
    </div>
  );
}
