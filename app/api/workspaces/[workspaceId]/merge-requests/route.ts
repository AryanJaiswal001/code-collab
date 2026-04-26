import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as diff from "diff";
import {
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

const mergeRequestAuthorInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
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
};

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
    reason: "merge-request-approved",
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
        changes: {
          patch,
          oldContent,
          newContent: body.content,
          path,
        },
      },
      include: mergeRequestAuthorInclude,
    });

    emitWorkspaceMergeRequestChanged(access.playground.workspaceLink, "new");

    return NextResponse.json({
      ...mr,
      author: {
        ...mr.author,
        role:
          mr.playground.ownerId === mr.authorId
            ? "OWNER"
            : (mr.playground.members.find((m) => m.userId === mr.authorId)
                ?.role ?? "MEMBER"),
      },
    });
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
      include: mergeRequestAuthorInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = mrs.map((mr) => ({
      ...mr,
      author: {
        ...mr.author,
        role:
          mr.playground.ownerId === mr.authorId
            ? "OWNER"
            : (mr.playground.members.find((m) => m.userId === mr.authorId)
                ?.role ?? "MEMBER"),
      },
    }));

    return NextResponse.json(result);
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
    const status = body?.status;

    if (!mrId || (status !== "APPROVED" && status !== "REJECTED")) {
      return NextResponse.json(
        { error: "A merge request id and valid status are required." },
        { status: 400 },
      );
    }

    const mr = await prisma.mergeRequest.findFirst({
      where: {
        id: mrId,
        playgroundId: access.playground.id,
      },
      include: mergeRequestAuthorInclude,
    });

    if (!mr) {
      return NextResponse.json({ error: "MR not found" }, { status: 404 });
    }

    const mrAuthorRole =
      mr.playground.ownerId === mr.authorId
        ? "OWNER"
        : (mr.playground.members.find((m) => m.userId === mr.authorId)?.role ??
          "MEMBER");

    // Role checks
    // 1. If MR is created by MEMBER: ADMIN or OWNER can Accept/Reject
    // 2. If MR is created by OWNER: OWNER can directly merge
    if (mrAuthorRole === "MEMBER" && access.role === "MEMBER") {
      return NextResponse.json(
        { error: "Only admins can approve MRs from members." },
        { status: 403 },
      );
    }
    if (mrAuthorRole === "OWNER" && access.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the owner can merge their own MRs." },
        { status: 403 },
      );
    }

    if (status === "APPROVED") {
      const changes = mr.changes as {
        path?: unknown;
        newContent?: unknown;
      };
      const path = typeof changes.path === "string" ? changes.path : null;
      const newContent =
        typeof changes.newContent === "string" ? changes.newContent : null;

      if (!path || newContent === null) {
        return NextResponse.json(
          { error: "Invalid patch data" },
          { status: 400 },
        );
      }

      const pathParts = path.split("/");
      const name = pathParts.pop() || path;
      const parentPath = pathParts.length > 0 ? pathParts.join("/") : null;
      const fileExtension = name.includes(".") ? name.split(".").pop() : null;

      await prisma.playgroundEntry.upsert({
        where: {
          playgroundId_path: {
            playgroundId: access.playground.id,
            path,
          },
        },
        create: {
          playgroundId: access.playground.id,
          path,
          name,
          parentPath,
          fileExtension,
          content: newContent,
          type: "FILE",
          updatedById: access.user.id,
        },
        update: {
          content: newContent,
          updatedAt: new Date(),
          updatedById: access.user.id,
        },
      });

      await prisma.playground.update({
        where: {
          id: access.playground.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    const updatedMr = await prisma.mergeRequest.update({
      where: {
        id: mrId,
      },
      data: {
        status,
      },
      include: mergeRequestAuthorInclude,
    });

    emitWorkspaceMergeRequestChanged(
      access.playground.workspaceLink,
      "updated",
    );

    if (status === "APPROVED") {
      emitWorkspaceTreeUpdate(
        createWorkspaceTreeEvent(
          access,
          `${getActorName(access.user)} approved ${mr.title}.`,
        ),
      );
    }

    return NextResponse.json({
      mr: {
        ...updatedMr,
        author: {
          ...updatedMr.author,
          role:
            updatedMr.playground.ownerId === updatedMr.authorId
              ? "OWNER"
              : (updatedMr.playground.members.find(
                  (m) => m.userId === updatedMr.authorId,
                )?.role ?? "MEMBER"),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update merge request") },
      { status: 500 },
    );
  }
}
