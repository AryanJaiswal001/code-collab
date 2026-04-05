import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 },
      );
    }

    console.log(
      `[POST /api/workspace] Creating workspace with projectId: ${projectId}`,
    );

    // Prevent duplicate errors by doing an upsert or checking first
    const workspace = await prisma.workspace.upsert({
      where: { projectId },
      update: {},
      create: { projectId },
    });

    console.log(
      `[POST /api/workspace] Successfully saved to MongoDB:`,
      workspace,
    );
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/workspace] Prisma query failed:", error);
    return NextResponse.json(
      { error: "Failed to create workspace", details: error.message },
      { status: 500 },
    );
  }
}
