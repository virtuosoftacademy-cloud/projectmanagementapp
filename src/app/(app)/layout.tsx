import { SessionProvider } from "next-auth/react";
import { AppShell } from "@/components/app-shell";
import { getOverdueTasks, getProjects, getTeams, getUserWorkspaces } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Every route in this group is behind auth. `proxy.ts` redirects anonymous
  // requests early; this is the check that actually enforces it.
  const user = await requireUser();
  const [projects, teams, overdue, workspaces] = await Promise.all([
    getProjects(user.workspaceId),
    getTeams(user.workspaceId),
    getOverdueTasks(user.workspaceId),
    getUserWorkspaces(user.id),
  ]);

  return (
    <SessionProvider>
      <AppShell
        user={user}
        projects={projects.map(({ id, name }) => ({ id, name }))}
        teamCount={teams.length}
        workspaces={workspaces}
        // Sidebar count badges, resolved server-side rather than polled.
        badges={{ "/projects/tasks": overdue.length }}
      >
        {children}
      </AppShell>
    </SessionProvider>
  );
}
