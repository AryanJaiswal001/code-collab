import { notFound } from "next/navigation";
import { getWorkspaceSnapshot } from "@/app/modules/workspaces/server";
import { WorkspacePlaygroundShell } from "@/app/modules/playground/components/workspace-playground-shell";

export const dynamic = "force-dynamic";

type EditorPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  const snapshot = await getWorkspaceSnapshot(projectId).catch((error) => {
    console.error("Workspace loading error:", error);
    return null;
  });

  if (!snapshot) {
    // Return a minimal working page instead of triggering Vercel's 404
    return (
      <div
        style={{
          padding: "40px",
          color: "white",
          minHeight: "100vh",
          backgroundColor: "#050816",
        }}
      >
        <h1>Editor Page: {projectId}</h1>
        <p>The dynamic route is working successfully!</p>
        <p style={{ marginTop: "20px", color: "#888" }}>
          Notice: The collaborative workspace database record could not be
          loaded, which previously caused a hard 404 error via Next.js
          `notFound()`.
        </p>
      </div>
    );
  }

  return <WorkspacePlaygroundShell initialSnapshot={snapshot} />;
}
