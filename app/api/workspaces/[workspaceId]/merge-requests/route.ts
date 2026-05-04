import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { WorkspaceActivity } from "@/app/modules/workspaces/types";
import { prisma } from "@/lib/prisma";
import * as diff from "diff";
import {
  emitWorkspaceActivity,
  emitWorkspaceMergeRequestChanged,
  emitWorkspaceTreeUpdate,
} from "@/lib/collaboration/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MergeRequestRouteContext = {
  params: Promise<{ workspaceId: string }>;
};

type MergeRequestAccess = {
  playground: {
    id: string;
    workspaceLink: string;
    ownerId: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type ReviewStatus = "ACCEPTED" | "REJECTED";

type MergeRequestUserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type MergeRequestWithRelations = {
  authorId: string;
  reviewedById: string | null;
  author: MergeRequestUserProfile;
  reviewedBy: MergeRequestUserProfile | null;
  playground: {
    ownerId: string;
    members: Array<{
      userId: string;
      role: MergeRequestAccess["role"];
    }>;
  };
};

const mergeRequestUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

const mergeRequestInclude = {
  author: {
    select: mergeRequestUserSelect,
  },
  reviewedBy: {
    select: mergeRequestUserSelect,
  },
  playground: {
    select: {
      ownerId: true,
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  },
} as const;

function getActorName(user: { name: string | null; email: string | null }) {
  return user.name?.trim() || user.email?.split("@")[0] || "Collaborator";
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error
  ) {
    return payload.error;
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRoleForUser(
  playground: MergeRequestWithRelations["playground"],
  userId: string,
) {
  return playground.ownerId === userId
    ? "OWNER"
    : (playground.members.find((member) => member.userId === userId)?.role ??
        "MEMBER");
}

function serializeMergeRequest<T extends MergeRequestWithRelations>(mr: T) {
  const { author, reviewedBy, playground, ...mergeRequest } = mr;

  return {
    ...mergeRequest,
    author: {
      ...author,
      role: getRoleForUser(playground, mr.authorId),
    },
    reviewedBy: reviewedBy
      ? {
          ...reviewedBy,
          role: getRoleForUser(playground, reviewedBy.id),
        }
      : null,
  };
}

function normalizeReviewStatus(status: unknown): ReviewStatus | null {
  if (status === "ACCEPTED" || status === "accepted") {
    return "ACCEPTED";
  }

  if (status === "APPROVED" || status === "approved") {
    return "ACCEPTED";
  }

  if (status === "REJECTED" || status === "rejected") {
    return "REJECTED";
  }

  return null;
}

function getMergeRequestFileChange(changes: unknown) {
  const change = Array.isArray(changes) ? changes[0] : changes;

  if (!isRecord(change)) {
    return null;
  }

  const path = typeof change.path === "string" ? change.path.trim() : "";
  const newContent =
    typeof change.newContent === "string"
      ? change.newContent
      : typeof change.content === "string"
        ? change.content
        : null;

  if (!path || newContent === null) {
    return null;
  }

  return {
    path,
    newContent,
  };
}

function serializeActivity(activity: {
  id: string;
  type: WorkspaceActivity["type"];
  message: string;
  filePath: string | null;
  createdAt: Date;
  actor: MergeRequestUserProfile | null;
}): WorkspaceActivity {
  return {
    id: activity.id,
    type: activity.type,
    message: activity.message,
    filePath: activity.filePath,
    createdAt: activity.createdAt.toISOString(),
    actor: activity.actor
      ? {
          userId: activity.actor.id,
          name: getActorName(activity.actor),
          email: activity.actor.email,
          image: activity.actor.image,
          username: activity.actor.email?.split("@")[0] ?? null,
        }
      : null,
  };
}

async function getMergeRequestAccess(
  workspaceLink: string,
): Promise<MergeRequestAccess | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playground = await prisma.playground.findUnique({
    where: {
      workspaceLink,
    },
    select: {
      id: true,
      workspaceLink: true,
      ownerId: true,
    },
  });

  if (!playground) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const member = await prisma.playgroundMember.findFirst({
    where: {
      playgroundId: playground.id,
      userId: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (!member && playground.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return {
    playground,
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    },
    role:
      playground.ownerId === session.user.id
        ? "OWNER"
        : (member?.role ?? "MEMBER"),
  };
}

function isAccessResponse(
  value: MergeRequestAccess | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

function createWorkspaceTreeEvent(access: MergeRequestAccess, summary: string) {
  return {
    workspaceId: access.playground.workspaceLink,
    reason: "merge-request-accepted",
    summary,
    triggeredAt: new Date().toISOString(),
    actor: {
      userId: access.user.id,
      name: getActorName(access.user),
      email: access.user.email,
      image: access.user.image,
      username: access.user.email?.split("@")[0] ?? null,
      role: access.role,
    },
  };
}

async function applyMergeRequestFileChange(
  access: MergeRequestAccess,
  change: { path: string; newContent: string },
) {
  const currentEntry = await prisma.playgroundEntry.findUnique({
    where: {
      playgroundId_path: {
        playgroundId: access.playground.id,
        path: change.path,
      },
    },
    select: {
      id: true,
      type: true,
    },
  });

  if (currentEntry && currentEntry.type !== "FILE") {
    return NextResponse.json(
      { error: "Merge requests can only apply to files." },
      { status: 400 },
    );
  }

  const pathParts = change.path.split("/");
  const name = pathParts.pop() || change.path;
  const parentPath = pathParts.length > 0 ? pathParts.join("/") : null;
  const fileExtension = name.includes(".") ? name.split(".").pop() : null;

  if (currentEntry) {
    await prisma.playgroundEntry.update({
      where: {
        id: currentEntry.id,
      },
      data: {
        content: change.newContent,
        revision: {
          increment: 1,
        },
        updatedById: access.user.id,
      },
    });
  } else {
    await prisma.playgroundEntry.create({
      data: {
        playgroundId: access.playground.id,
        path: change.path,
        name,
        parentPath,
        fileExtension,
        content: change.newContent,
        revision: 1,
        type: "FILE",
        updatedById: access.user.id,
      },
    });
  }

  await prisma.playground.update({
    where: {
      id: access.playground.id,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  return change.path;
}

async function recordMergeRequestReviewActivity(params: {
  access: MergeRequestAccess;
  mergeRequest: { id: string; title: string };
  status: ReviewStatus;
  filePath: string | null;
}) {
  const action = params.status === "ACCEPTED" ? "accepted" : "rejected";
  const created = await prisma.playgroundActivity.create({
    data: {
      playgroundId: params.access.playground.id,
      actorId: params.access.user.id,
      type:
        params.status === "ACCEPTED"
          ? "MERGE_REQUEST_ACCEPTED"
          : "MERGE_REQUEST_REJECTED",
      message: `${getActorName(params.access.user)} ${action} ${params.mergeRequest.title}.`,
      filePath: params.filePath,
      metadata: {
        mergeRequestId: params.mergeRequest.id,
        status: params.status.toLowerCase(),
      },
      dedupeKey: `merge-request-review:${params.mergeRequest.id}:${params.status}`,
    },
  });

  const activity = await prisma.playgroundActivity.findUnique({
    where: {
      id: created.id,
    },
    include: {
      actor: {
        select: mergeRequestUserSelect,
      },
    },
  });

  return activity ? serializeActivity(activity) : null;
}

export async function POST(
  request: Request,
  { params }: MergeRequestRouteContext,
) {
  try {
    const workspaceId = (await params).workspaceId;
    const access = await getMergeRequestAccess(workspaceId);

    if (isAccessResponse(access)) {
      return access;
    }

    const body = (await request.json().catch(() => null)) as {
      title?: string;
      description?: string;
      path?: string;
      content?: string;
    } | null;
    const path = body?.path?.trim();

    if (!path || typeof body?.content !== "string") {
      return NextResponse.json(
        { error: "A file path and content are required." },
        { status: 400 },
      );
    }

    const currentEntry = await prisma.playgroundEntry.findUnique({
      where: {
        playgroundId_path: {
          playgroundId: access.playground.id,
          path,
        },
      },
      select: {
        type: true,
        content: true,
      },
    });

    if (currentEntry && currentEntry.type !== "FILE") {
      return NextResponse.json(
        { error: "Merge requests can only target files." },
        { status: 400 },
      );
    }

    const oldContent = currentEntry?.content ?? "";
    const patch = diff.createPatch(
      path,
      oldContent,
      body.content,
      "Workspace",
      "Merge request",
    );

    const mr = await prisma.mergeRequest.create({
      data: {
        playgroundId: access.playground.id,
        authorId: access.user.id,
        title: body.title?.trim() || `Update ${path}`,
        description: body.description?.trim() || null,
        status: "PENDING",
        changes: {
          patch,
          oldContent,
          newContent: body.content,
          path,
        },
      },
      include: mergeRequestInclude,
    });

    emitWorkspaceMergeRequestChanged(access.playground.workspaceLink, "new");

    return NextResponse.json(serializeMergeRequest(mr));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create merge request" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: MergeRequestRouteContext,
) {
  try {
    const workspaceId = (await params).workspaceId;
    const access = await getMergeRequestAccess(workspaceId);

    if (isAccessResponse(access)) {
      return access;
    }

    const mrs = await prisma.mergeRequest.findMany({
      where: {
        playgroundId: access.playground.id,
      },
      include: mergeRequestInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(mrs.map(serializeMergeRequest));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to get MRs" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: MergeRequestRouteContext,
) {
  try {
    const workspaceId = (await params).workspaceId;
    const access = await getMergeRequestAccess(workspaceId);

    if (isAccessResponse(access)) {
      return access;
    }

    const body = (await request.json().catch(() => null)) as {
      mrId?: string;
      status?: string;
    } | null;
    const mrId = body?.mrId?.trim();
    const status = normalizeReviewStatus(body?.status);

    if (!mrId || !status) {
      return NextResponse.json(
        { error: "A merge request id and valid status are required." },
        { status: 400 },
      );
    }

    if (access.role !== "OWNER" && access.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins or owners can review merge requests." },
        { status: 403 },
      );
    }

    const mr = await prisma.mergeRequest.findFirst({
      where: {
        id: mrId,
        playgroundId: access.playground.id,
      },
      include: mergeRequestInclude,
    });

    if (!mr) {
      return NextResponse.json({ error: "MR not found" }, { status: 404 });
    }

    if (mr.status !== "PENDING") {
      return NextResponse.json(
        { error: "This merge request has already been reviewed." },
        { status: 409 },
      );
    }

    const fileChange = getMergeRequestFileChange(mr.changes);
    let appliedPath: string | null = null;

    if (status === "ACCEPTED") {
      if (!fileChange) {
        return NextResponse.json(
          { error: "Invalid patch data" },
          { status: 400 },
        );
      }

      const result = await applyMergeRequestFileChange(access, fileChange);

      if (result instanceof NextResponse) {
        return result;
      }

      appliedPath = result;
    } else {
      appliedPath = fileChange?.path ?? null;
    }

    const updatedMr = await prisma.mergeRequest.update({
      where: {
        id: mrId,
      },
      data: {
        status,
        reviewedById: access.user.id,
        reviewedAt: new Date(),
      },
      include: mergeRequestInclude,
    });

    const activity = await recordMergeRequestReviewActivity({
      access,
      mergeRequest: mr,
      status,
      filePath: appliedPath,
    });

    emitWorkspaceMergeRequestChanged(
      access.playground.workspaceLink,
      "updated",
    );

    if (activity) {
      emitWorkspaceActivity(activity, access.playground.workspaceLink);
    }

    if (status === "ACCEPTED") {
      emitWorkspaceTreeUpdate(
        createWorkspaceTreeEvent(
          access,
          `${getActorName(access.user)} accepted ${mr.title}.`,
        ),
      );
    }

    return NextResponse.json({
      mr: serializeMergeRequest(updatedMr),
      activity,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update merge request") },
      { status: 500 },
    );
  }
}
