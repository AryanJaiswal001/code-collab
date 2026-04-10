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
