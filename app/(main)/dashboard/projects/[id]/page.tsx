import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { KanbanBoard } from "@/components/projects/kanban/KanbanBoard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect("/auth/login");
  }

  // Get active workspace from cookie
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        include: {
          user: true
        }
      }
    }
  });

  if (!project) {
    notFound();
  }

  // Security check: Verify project belongs to active workspace
  if (activeWorkspaceId && project.workspaceId !== activeWorkspaceId) {
    redirect("/dashboard/projects");
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#fefefe]">
      <div className="p-4 md:p-8 flex-none">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard/projects" className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div className="flex items-center gap-3">
             <div 
               className="h-2.5 w-2.5 rounded-full" 
               style={{ backgroundColor: project.color || "#3b82f6" }} 
             />
             <h1 className="text-2xl font-black text-gray-900 tracking-tight">{project.name}</h1>
          </div>
        </div>
        <p className="text-sm text-gray-400 max-w-2xl ml-12">
          {project.description || "No description provided for this project."}
        </p>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <KanbanBoard 
          initialTasks={project.tasks} 
          projectId={project.id} 
          userId={user.id}
        />
      </div>
    </div>
  );
}
