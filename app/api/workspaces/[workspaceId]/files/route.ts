import {
  assignWorkspaceFile,
  createWorkspaceEntry,
  deleteWorkspaceEntry,
  pushWorkspaceFile,
  renameWorkspaceEntry,
} from "@/app/modules/workspaces/server";
import { handleWorkspaceRouteError } from "@/app/modules/workspaces/http";
import {
  emitWorkspaceActivity,
  emitWorkspaceFilePush,
  emitWorkspaceTreeUpdate,
} from "@/lib/collaboration/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

type FilesRouteBody =
  | {
      action: "push";
      path: string;
      content: string;
    }
  | {
      action: "create";
      parentPath: string | null;
      kind: "file" | "folder";
      name: string;
    }
  | {
      action: "rename";
      path: string;
      nextName: string;
    }
  | {
      action: "delete";
      path: string;
    }
  | {
      action: "assign";
      path: string;
      assignedUserId: string | null;
    };

export async function POST(
  request: Request,
  ctx: WorkspaceRouteContext,
) {
  try {
    const { workspaceId } = await ctx.params;
    const body = (await request.json()) as FilesRouteBody;

    switch (body.action) {
      case "push": {
        const result = await pushWorkspaceFile({
          workspaceLink: workspaceId,
          path: body.path,
          content: body.content,
        });

        emitWorkspaceFilePush(result.event);
        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      case "create": {
        const result = await createWorkspaceEntry({
          workspaceLink: workspaceId,
          parentPath: body.parentPath,
          kind: body.kind,
          name: body.name,
        });

        emitWorkspaceTreeUpdate(result.event);
        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      case "rename": {
        const result = await renameWorkspaceEntry({
          workspaceLink: workspaceId,
          path: body.path,
          nextName: body.nextName,
        });

        emitWorkspaceTreeUpdate(result.event);
        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      case "delete": {
        const result = await deleteWorkspaceEntry({
          workspaceLink: workspaceId,
          path: body.path,
        });

        emitWorkspaceTreeUpdate(result.event);
        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      case "assign": {
        const result = await assignWorkspaceFile({
          workspaceLink: workspaceId,
          path: body.path,
          assignedUserId: body.assignedUserId,
        });

        emitWorkspaceTreeUpdate(result.event);
        if (result.activity) {
          emitWorkspaceActivity(result.activity, workspaceId);
        }

        return Response.json(result);
      }
      default:
        return Response.json(
          {
            error: "Unsupported workspace file action.",
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
