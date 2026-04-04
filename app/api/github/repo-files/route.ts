import type { NextRequest } from "next/server";
import { importGitHubRepository, isGitHubIntegrationError } from "@/app/modules/github/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const repositoryFullName = request.nextUrl.searchParams.get("repo");

  if (!repositoryFullName) {
    return Response.json(
      { error: "Missing required repo query parameter." },
      { status: 400 },
    );
  }

  try {
    const response = await importGitHubRepository(repositoryFullName);
    return Response.json(response);
  } catch (error) {
    if (isGitHubIntegrationError(error)) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      { error: "Unable to import that GitHub repository right now." },
      { status: 500 },
    );
  }
}
