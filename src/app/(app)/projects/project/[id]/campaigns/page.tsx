import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignsGrid } from "@/components/projects/campaigns-grid";
import { can } from "@/lib/permissions";
import { getCampaigns, getProject } from "@/lib/queries";
import { getSessionUser, requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/projects/project/[id]/campaigns">): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getSessionUser();
  const project = viewer ? await getProject(viewer.workspaceId, id) : null;
  return { title: `${project?.name ?? "Project"} — Campaigns` };
}

export default async function CampaignsPage({
  params,
}: PageProps<"/projects/project/[id]/campaigns">) {
  const viewer = await requireUser();
  const { id } = await params;
  const project = await getProject(viewer.workspaceId, id);
  if (!project) notFound();

  const campaigns = await getCampaigns(viewer.workspaceId, project.id);

  return (
    <CampaignsGrid
      project={project}
      campaigns={campaigns}
      canEdit={can(viewer.role, "projects.edit")}
      canDelete={can(viewer.role, "projects.delete")}
    />
  );
}
