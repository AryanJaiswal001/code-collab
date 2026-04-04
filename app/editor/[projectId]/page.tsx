import { getProjectById } from "@/app/modules/dashboard/actions";
import { MinimalPlaygroundShell } from "@/app/modules/playground/components/minimal-playground-shell";

function formatProjectName(projectId: string) {
  return projectId
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export default async function EditorPage({
  params,
}: PageProps<"/editor/[projectId]">) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  const projectName = project?.title ?? formatProjectName(projectId);

  return (
    <MinimalPlaygroundShell
      key={projectId}
      projectId={projectId}
      projectName={projectName}
      initialRepositoryFullName={project?.repositoryFullName ?? null}
    />
  );
}
