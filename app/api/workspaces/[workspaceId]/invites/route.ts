import {
  createWorkspaceInviteLink,
  sendWorkspaceEmailInviteBatch,
} from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";
import { emitWorkspaceActivity } from "@/lib/collaboration/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

type InvitesRouteBody =
  | {
      action: "create-link";
      email?: string | null;
    }
  | {
      action: "send-email-batch";
      emails: string[];
    };

export async function POST(
  request: Request,
  ctx: WorkspaceRouteContext,
) {
  try {
    const { workspaceId } = await ctx.params;
    const body = (await request.json()) as InvitesRouteBody;

    switch (body.action) {
      case "create-link": {
        const result = await createWorkspaceInviteLink({
          workspaceLink: workspaceId,
          email: body.email ?? null,
        });

        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      case "send-email-batch": {
        const result = await sendWorkspaceEmailInviteBatch({
          workspaceLink: workspaceId,
          emails: body.emails,
        });

        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      default:
        return Response.json(
          {
            error: "Unsupported invite action.",
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
