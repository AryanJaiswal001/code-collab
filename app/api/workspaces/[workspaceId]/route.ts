import {
  ensureWorkspaceMembershipOnEntry,
  getWorkspaceSnapshot,
} from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";
import { emitWorkspaceMembersChanged } from "@/lib/collaboration/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

type WorkspaceRouteBody = {
  action: "join";
};

export async function GET(_request: Request, ctx: WorkspaceRouteContext) {
  try {
    const { workspaceId } = await ctx.params;
    const snapshot = await getWorkspaceSnapshot(workspaceId);
    return Response.json(snapshot);
  } catch (error) {
    return handleWorkspaceRouteError(error);
  }
}

export async function POST(request: Request, ctx: WorkspaceRouteContext) {
  try {
    const { workspaceId } = await ctx.params;
    const body = (await request
      .json()
      .catch(() => null)) as WorkspaceRouteBody | null;

    if (!body || body.action !== "join") {
      return Response.json(
        {
          error: "Unsupported workspace action.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await ensureWorkspaceMembershipOnEntry(workspaceId);

    if (result.joined) {
      emitWorkspaceMembersChanged(workspaceId, "join");
    }

    return Response.json(result);
  } catch (error) {
    return handleWorkspaceRouteError(error);
  }
}
