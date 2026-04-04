import { getWorkspaceSnapshot } from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(
  _request: Request,
  ctx: WorkspaceRouteContext,
) {
  try {
    const { workspaceId } = await ctx.params;
    const snapshot = await getWorkspaceSnapshot(workspaceId);
    return Response.json(snapshot);
  } catch (error) {
    return handleWorkspaceRouteError(error);
  }
}
