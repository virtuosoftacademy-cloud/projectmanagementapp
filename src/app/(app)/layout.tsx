import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import {
  getOverdueTasks,
  getProjects,
  getRunningTimer,
  getTeams,
  getUserWorkspaces,
} from "@/lib/queries";
import { getViewerPages, hasPermission, projectScope, requireUser } from "@/lib/session";


export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Every route in this group is behind auth. `proxy.ts` redirects anonymous
  // requests early; this is the check that actually enforces it.
  const user = await requireUser();
  const session = await auth();
  const [
    projects,
    teams,
    overdue,
    workspaces,
    pages,
    canCreateWorkspace,
    canManageFeatures,
    runningTimer,
  ] = await Promise.all([
    getProjects(user.workspaceId, await projectScope()),
    getTeams(user.workspaceId),
    getOverdueTasks(user.workspaceId),
    getUserWorkspaces(user.id),
    getViewerPages(),
    // Resolved through the viewer’s actual role — a custom role that narrows
    // this away hides the control, matching what the action would allow.
    hasPermission("workspace.create"),
    hasPermission("workspace.settings"),
    // Read here rather than per page, so the header can show it everywhere.
    getRunningTimer(user.workspaceId, user.id),
  ]);

  return (
    /*
     * The server session is handed to the provider rather than letting it fetch
     * one. Without it `useSession()` starts in `loading`, and next-auth's
     * `update()` returns immediately and does nothing while loading — which is
     * how the workspace switcher could appear to work and change nothing.
     */
    <SessionProvider session={session}>
      <AppShell
        user={user}
        projects={projects.map(({ id, name, features }) => ({ id, name, features }))}
        teamCount={teams.length}
        workspaces={workspaces}
        pages={pages}
        canCreateWorkspace={canCreateWorkspace}
        canManageFeatures={canManageFeatures}
        // Sidebar count badges, resolved server-side rather than polled.
        badges={{ "/projects/tasks": overdue.length }}
        runningTimer={runningTimer}
      >
        {children}
      </AppShell>
    </SessionProvider>
  );
}
