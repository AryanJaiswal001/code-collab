import {
  createWorkspaceChatEntry,
  getRealtimeWorkspaceMember,
  recordWorkspacePresenceActivity,
} from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";
import type { WorkspaceActor, WorkspaceActivityTypeValue } from "@/app/modules/workspaces/types";
import {
  getRealtimeSharedSecret,
  REALTIME_INTERNAL_SECRET_HEADER,
} from "@/lib/collaboration/realtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

type RealtimeWorkspaceActionBody =
  | {
      action: "member";
      userId: string;
    }
  | {
      action: "chat";
      content: string;
      user: WorkspaceActor;
    }
  | {
      action: "activity";
      userId: string;
      type: Extract<
        WorkspaceActivityTypeValue,
        "MEMBER_JOINED" | "MEMBER_LEFT" | "FILE_OPENED" | "VOICE_JOINED" | "VOICE_LEFT"
      >;
      message: string;
      filePath?: string | null;
      dedupeKey: string;
      dedupeWindowMs?: number;
    };

function hasInternalRealtimeAccess(request: Request) {
  const expectedSecret = getRealtimeSharedSecret();
  const providedSecret = request.headers.get(REALTIME_INTERNAL_SECRET_HEADER)?.trim();

  return Boolean(expectedSecret && providedSecret && providedSecret === expectedSecret);
}

export async function POST(
  request: Request,
  ctx: WorkspaceRouteContext,
) {
  if (!hasInternalRealtimeAccess(request)) {
    return Response.json(
      {
        error: "Unauthorized realtime request.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const { workspaceId } = await ctx.params;
    const body = (await request.json()) as RealtimeWorkspaceActionBody;

    switch (body.action) {
      case "member":
        return Response.json(
          await getRealtimeWorkspaceMember(workspaceId, body.userId),
        );
      case "chat":
        return Response.json(
          await createWorkspaceChatEntry({
            workspaceLink: workspaceId,
            content: body.content,
            user: body.user,
          }),
        );
      case "activity":
        return Response.json(
          await recordWorkspacePresenceActivity({
            workspaceLink: workspaceId,
            userId: body.userId,
            type: body.type,
            message: body.message,
            filePath: body.filePath ?? null,
            dedupeKey: body.dedupeKey,
            dedupeWindowMs: body.dedupeWindowMs,
          }),
        );
      default:
        return Response.json(
          {
            error: "Unsupported realtime action.",
          },
          {
            status: 400,
          },
        );
    }
  } catch (error) {
    return handleWorkspaceRouteError(error);
  }
}
