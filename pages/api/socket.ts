import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as NetServer } from "node:net";
import type { Server as HttpServer } from "node:http";
import { attachWorkspaceRealtimeServer } from "@/lib/collaboration/realtime";

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

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponseWithSocket,
) {
  attachWorkspaceRealtimeServer(res.socket.server);
  res.status(200).json({ ok: true });
}
