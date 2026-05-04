
'use client';

import { ProjectProps } from "@/app/types";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { ProjectList } from "./ProjectList";


export function ProjectsContent({
    projects,
    activeWorkspace,
    teams,
    users
}: ProjectProps) {
    return (
        <div className="px-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                            {activeWorkspace?.name || "No Workspace"}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Projects</h1>
                        <p className="text-sm text-gray-400 mt-0.5">All projects in your workspace</p>
                    </div>
                </div>

                <CreateProjectDialog
                    workspaceId={activeWorkspace?.id || ""}
                    teams={teams}
                    users={users}
                    showButton={true}
                />
            </div>

            <ProjectList
                projects={projects}
                teamMembers={teams}
            />
        </div>
    );
}