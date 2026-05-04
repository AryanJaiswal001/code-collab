import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await params;
    console.log(`[GET /api/workspace] Retrieving workspace: ${projectId}`);

    const workspace = await prisma.workspace.findUnique({
      where: { projectId },
    });

    if (!workspace) {
      console.log(
        `[GET /api/workspace] Workspace not found in MongoDB for: ${projectId}`,
      );
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    console.log(
      `[GET /api/workspace] Successfully retrieved workspace:`,
      workspace,
    );
    return NextResponse.json({ workspace }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/workspace] Prisma connection/query error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
