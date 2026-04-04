import { auth } from "@/auth";
import { getRealtimeServerUrl, REALTIME_SOCKET_PATH } from "@/lib/collaboration/realtime-config";
import { createRealtimeAccessToken } from "@/lib/collaboration/realtime-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEmailHandle(email?: string | null) {
  if (!email) {
    return null;
  }

  const [localPart] = email.split("@");
  return localPart?.trim() || null;
}

export async function GET() {
  const realtimeUrl = getRealtimeServerUrl();

  if (!realtimeUrl) {
    return Response.json({
      mode: "local" as const,
      path: REALTIME_SOCKET_PATH,
    });
  }

  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return Response.json(
      {
        error: "Sign in to connect to realtime collaboration.",
      },
      {
        status: 401,
      },
    );
  }

  return Response.json({
    mode: "external" as const,
    url: realtimeUrl,
    path: REALTIME_SOCKET_PATH,
    token: createRealtimeAccessToken({
      userId: user.id,
      name: user.name?.trim() || getEmailHandle(user.email) || "Collaborator",
      email: user.email ?? null,
      image: user.image ?? null,
      username: user.username ?? getEmailHandle(user.email) ?? null,
    }),
  });
}
