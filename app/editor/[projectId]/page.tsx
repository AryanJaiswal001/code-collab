import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getWorkspaceSnapshot,
  WorkspaceServiceError,
} from "@/app/modules/workspaces/server";
import { WorkspacePlaygroundShell } from "@/app/modules/playground/components/workspace-playground-shell";

export const dynamic = "force-dynamic";

type EditorPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  
  // Debug DB connection / parameters
  console.log(`[EditorPage] Opening workspace simulator for projectId: ${projectId}`);
  
  const session = await auth();

  if (!session) {
    redirect(
      `/auth/sign-in?callbackUrl=${encodeURIComponent(`/editor/${projectId}`)}`,
    );
  }

  try {
    console.log(`[EditorPage] Fetching Workspace snapshot for ${projectId}...`);
    const snapshot = await getWorkspaceSnapshot(projectId);
    console.log(`[EditorPage] Snapshot successfully retrieved from database.`);
    return <WorkspacePlaygroundShell initialSnapshot={snapshot} />;
  } catch (error: any) {
    console.error("[EditorPage ERROR] Workspace loading error:", error);
    console.error("[EditorPage ERROR DETAILS] Status:", error?.status, "Message:", error?.message);

    const status = error?.status || 500;
    const isAccessDenied = status === 403;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_30%),#050816] px-4 py-10 text-white">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.45)] text-center">
          <h1 className="text-2xl font-semibold text-white/90">
            {isAccessDenied ? "Access Denied" : "Workspace Not Found"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/60">
            {isAccessDenied
              ? "You do not have permission to view this workspace. Please ask the owner to send you an invite link."
              : "The workspace you are looking for does not exist, or you used an invalid link."}
          </p>
        </div>
      </div>
    );
  }
}
