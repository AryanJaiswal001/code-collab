import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as NetServer } from "node:net";
import type { Server as HttpServer } from "node:http";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse["socket"] & {
    server: HttpServer & NetServer;
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponseWithSocket,
) {
  if (process.env.VERCEL === "1") {
    res.status(503).json({
      error:
        "In-process socket hosting is not supported on Vercel. Configure REALTIME_SERVER_URL to use the external realtime service.",
    });
    return;
  }

  const { attachWorkspaceRealtimeServer } = await import("@/lib/collaboration/realtime");
  attachWorkspaceRealtimeServer(res.socket.server);
  res.status(200).json({ ok: true });
}
