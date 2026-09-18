import type { Metadata } from "next";
import { WorkspacesView } from "@/components/workspaces/workspaces-view";
import { getUserWorkspaces, getWorkspace } from "@/lib/queries";
import { hasPermission, requirePage } from "@/lib/session";

export const metadata: Metadata = { title: "Workspaces" };

/**
 * The workspaces you belong to — an Account screen, not an admin one.
 *
 * `requireUser`, not `requirePermission`: belonging to several workspaces is a
 * fact about the user rather than a privilege, and the switcher in the sidebar
 * already serves every role. The management controls inside are gated per role.
 */
export default async function WorkspacesPage() {
  const viewer = await requirePage("workspaces");
  const [workspaces, current, canCreate, canRename] = await Promise.all([
    getUserWorkspaces(viewer.id),
    getWorkspace(viewer.workspaceId),
    // Resolved permissions, so a custom role that narrows these away hides the
    // controls rather than offering something the actions would refuse.
    hasPermission("workspace.create"),
    hasPermission("workspace.settings"),
  ]);

  return (
    <WorkspacesView
      workspaces={workspaces}
      currentWorkspaceId={viewer.workspaceId}
      currentDescription={current?.description ?? ""}
      canCreate={canCreate}
      canRename={canRename}
    />
  );
}
