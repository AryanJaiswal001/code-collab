"use client";

import { io, type Socket } from "socket.io-client";

type WorkspaceSocket = Socket;

let socketPromise: Promise<WorkspaceSocket> | null = null;
let activeSocket: WorkspaceSocket | null = null;

// Helper to reliably use environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";

if (!SOCKET_URL) {
  console.error("Missing NEXT_PUBLIC_SOCKET_URL environment variable");
}

type RealtimeConnectionConfig =
  | {
      mode: "local";
      path: string;
    }
  | {
      mode: "external";
      url: string;
      path: string;
      token: string;
    };

async function getRealtimeConnectionConfig() {
  const response = await fetch(`${API_URL}/api/realtime/token`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to prepare the realtime connection.");
  }

  return (await response.json()) as RealtimeConnectionConfig;
}

async function createSocket() {
  if (!SOCKET_URL) {
    throw new Error("NEXT_PUBLIC_SOCKET_URL environment variable is missing.");
  }

  const config = await getRealtimeConnectionConfig().catch(() => null);

  const socket = io(SOCKET_URL, {
    path: config?.path || "/api/socket_io",
    transports: ["websocket"],
    autoConnect: true,
    withCredentials: true,
    auth: {
      token: config && config.mode === "external" ? config.token : undefined,
    },
  });

  socket.on("connect", () => console.log("Connected:", socket.id));
  socket.on("connect_error", (err) => console.error("Socket error:", err));

  return socket;
}

export function getWorkspaceSocket() {
  if (activeSocket) {
    return Promise.resolve(activeSocket);
  }

  socketPromise ??= createSocket()
    .then((socket) => {
      activeSocket = socket;
      socket.on("disconnect", () => {
        activeSocket = null;
        socketPromise = null;
      });
      return socket;
    })
    .catch((error) => {
      socketPromise = null;
      throw error;
    });

  return socketPromise;
}
