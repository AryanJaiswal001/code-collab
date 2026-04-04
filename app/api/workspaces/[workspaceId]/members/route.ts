import {
  removeWorkspaceMember,
  setWorkspaceMemberVoiceMute,
  updateWorkspaceMemberRole,
} from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";
import {
  emitWorkspaceActivity,
  emitWorkspaceMembersChanged,
  enforceVoiceModeration,
} from "@/lib/collaboration/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

type MembersRouteBody =
  | {
      action: "set-role";
      memberId: string;
      role: "ADMIN" | "MEMBER";
    }
  | {
      action: "remove";
      memberId: string;
    }
  | {
      action: "set-voice-mute";
      memberId: string;
      isVoiceMuted: boolean;
    };

export async function POST(
  request: Request,
  ctx: WorkspaceRouteContext,
) {
  try {
    const { workspaceId } = await ctx.params;
    const body = (await request.json()) as MembersRouteBody;

    switch (body.action) {
      case "set-role": {
        const result = await updateWorkspaceMemberRole({
          workspaceLink: workspaceId,
          memberId: body.memberId,
          role: body.role,
        });

        emitWorkspaceMembersChanged(workspaceId, "role");
        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      case "remove": {
        const result = await removeWorkspaceMember({
          workspaceLink: workspaceId,
          memberId: body.memberId,
        });

        enforceVoiceModeration({
          workspaceId,
          userId: result.removedUserId,
          reason: "You were removed from the workspace.",
        });
        emitWorkspaceMembersChanged(workspaceId, "remove");
        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      case "set-voice-mute": {
        const member = await setWorkspaceMemberVoiceMute({
          workspaceLink: workspaceId,
          memberId: body.memberId,
          isVoiceMuted: body.isVoiceMuted,
        });

        if (body.isVoiceMuted) {
          enforceVoiceModeration({
            workspaceId,
            userId: member.userId,
            reason: "A workspace moderator muted your voice access.",
          });
        }

        emitWorkspaceMembersChanged(workspaceId, "voice");
        return Response.json(member);
      }
      default:
        return Response.json(
          {
            error: "Unsupported workspace member action.",
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
