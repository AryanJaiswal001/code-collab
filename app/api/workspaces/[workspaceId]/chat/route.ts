import { createWorkspaceChatEntry } from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";
import { emitWorkspaceChat } from "@/lib/collaboration/realtime";

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
    const body = (await request.json()) as { content?: string };
    const message = await createWorkspaceChatEntry({
      workspaceLink: workspaceId,
      content: body.content ?? "",
    });

    emitWorkspaceChat(message, workspaceId);
    return Response.json(message);
  } catch (error) {
    return handleWorkspaceRouteError(error);
  }
}
