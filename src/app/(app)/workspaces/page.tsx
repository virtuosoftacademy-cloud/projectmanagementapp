import type { Metadata } from "next";
import { WorkspacesView } from "@/components/workspaces/workspaces-view";
import { getUserWorkspaces, getWorkspace } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Workspaces" };

/**
 * The workspaces you belong to — an Account screen, not an admin one.
 *
 * `requireUser`, not `requirePermission`: belonging to several workspaces is a
 * fact about the user rather than a privilege, and the switcher in the sidebar
 * already serves every role. The management controls inside are gated per role.
 */
export default async function WorkspacesPage() {
  const viewer = await requireUser("/workspaces");
  const [workspaces, current] = await Promise.all([
    getUserWorkspaces(viewer.id),
    getWorkspace(viewer.workspaceId),
  ]);

  return (
    <WorkspacesView
      workspaces={workspaces}
      currentWorkspaceId={viewer.workspaceId}
      currentDescription={current?.description ?? ""}
    />
  );
}
