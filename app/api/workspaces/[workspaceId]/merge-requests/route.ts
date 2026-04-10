import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as diff from "diff";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (await params).workspaceId;
    const body = await request.json();
    const { title, description, path, content } = body;

    // Load playground to verify access
    const playground = await prisma.playground.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!playground) {
      return NextResponse.json(
        { error: "Playground not found" },
        { status: 404 },
      );
    }

    const isMember =
      playground.ownerId === session.user.id ||
      playground.members.some((m) => m.userId === session.user.id);

    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get current file content to build diff
    const currentEntry = await prisma.playgroundEntry.findUnique({
      where: { playgroundId_path: { playgroundId: workspaceId, path } },
    });

    const oldContent = currentEntry?.content ?? "";
    const patch = diff.createPatch(
      path,
      oldContent,
      content,
      "Original",
      "Modified",
    );

    // Save Merge Request
    const mr = await prisma.mergeRequest.create({
      data: {
        playgroundId: workspaceId,
        authorId: session.user.id,
        title: title || `Update ${path}`,
        description,
        changes: { patch, newContent: content, path },
      },
    });

    return NextResponse.json({ mr });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create merge request" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return new NextResponse("Unauthorized", { status: 401 });

    const workspaceId = (await params).workspaceId;

    const mrs = await prisma.mergeRequest.findMany({
      where: { playgroundId: workspaceId },
      include: { author: { select: { name: true, image: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(mrs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to get MRs" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = (await params).workspaceId;
    const body = await request.json();
    const { mrId, status } = body;

    const mr = await prisma.mergeRequest.findUnique({
      where: { id: mrId, playgroundId: workspaceId },
    });

    if (!mr) {
      return NextResponse.json({ error: "MR not found" }, { status: 404 });
    }

    // Only owner or authorized roles can approve, but for now we let any member.
    // In a real system, you'd check roles.

    if (status === "MERGED") {
      // Extract the new content and path from the changes we stored
      const { path, newContent } = mr.changes as any;

      if (!path || newContent === undefined) {
        return NextResponse.json(
          { error: "Invalid patch data" },
          { status: 400 },
        );
      }

      const pathParts = path.split("/");
      const name = pathParts.pop() || path;
      const parentPath = pathParts.length > 0 ? pathParts.join("/") : null;
      const fileExtension = name.includes(".") ? name.split(".").pop() : null;

      // Update or create the actual playground entry
      await prisma.playgroundEntry.upsert({
        where: {
          playgroundId_path: {
            playgroundId: workspaceId,
            path,
          },
        },
        create: {
          playgroundId: workspaceId,
          path,
          name,
          parentPath,
          fileExtension,
          content: newContent,
          type: "FILE",
        },
        update: {
          content: newContent,
          updatedAt: new Date(),
        },
      });
    }

    const updatedMr = await prisma.mergeRequest.update({
      where: { id: mrId },
      data: { status },
    });

    return NextResponse.json(updatedMr);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update merge request" },
      { status: 500 },
    );
  }
}
