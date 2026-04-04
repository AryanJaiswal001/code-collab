import { getRealtimeServerUrl, REALTIME_SOCKET_PATH } from "@/lib/collaboration/realtime-config";

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
    if (process.env.VERCEL === "1") {
      return Response.json(
        {
          error:
            "REALTIME_SERVER_URL is required on Vercel. Deploy realtime-server separately and configure REALTIME_SERVER_URL and REALTIME_SHARED_SECRET.",
        },
        {
          status: 503,
        },
      );
    }

    return Response.json({
      mode: "local" as const,
      path: REALTIME_SOCKET_PATH,
    });
  }

  const [{ auth }, { createRealtimeAccessToken }] = await Promise.all([
    import("@/auth"),
    import("@/lib/collaboration/realtime-token"),
  ]);

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
