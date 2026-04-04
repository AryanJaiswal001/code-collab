import type { NextRequest } from "next/server";
import { getGitHubRepositoriesForCurrentUser, isGitHubIntegrationError } from "@/app/modules/github/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
    const response = await getGitHubRepositoriesForCurrentUser(forceRefresh);

    return Response.json(response);
  } catch (error) {
    if (isGitHubIntegrationError(error)) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      { error: "Unable to load GitHub repositories right now." },
      { status: 500 },
    );
  }
}
