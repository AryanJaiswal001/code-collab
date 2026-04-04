import { importWorkspaceRepository } from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";
import {
  emitWorkspaceActivity,
  emitWorkspaceTreeUpdate,
} from "@/lib/collaboration/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function POST(
  request: Request,
  ctx: WorkspaceRouteContext,
) {
  try {
    const { workspaceId } = await ctx.params;
    const body = (await request.json()) as { repositoryFullName?: string };
    const result = await importWorkspaceRepository({
      workspaceLink: workspaceId,
      repositoryFullName: body.repositoryFullName ?? "",
    });

    emitWorkspaceTreeUpdate(result.event);
    if (result.activity) {
      emitWorkspaceActivity(result.activity, workspaceId);
    }

    return Response.json(result);
  } catch (error) {
    return handleWorkspaceRouteError(error);
  }
}
