import { notFound } from "next/navigation";
import { getWorkspaceSnapshot } from "@/app/modules/workspaces/server";
import { WorkspacePlaygroundShell } from "@/app/modules/playground/components/workspace-playground-shell";

export const dynamic = "force-dynamic";

type EditorPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  const snapshot = await getWorkspaceSnapshot(projectId).catch(() => null);

  if (!snapshot) {
    notFound();
  }

  return <WorkspacePlaygroundShell initialSnapshot={snapshot} />;
}
