"use client";

import { io, type Socket } from "socket.io-client";

type WorkspaceSocket = Socket;

let socketPromise: Promise<WorkspaceSocket> | null = null;
let activeSocket: WorkspaceSocket | null = null;

// Helper to reliably use environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";

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
  const config = await getRealtimeConnectionConfig();

  if (config.mode === "external") {
    const externalUrl = config.url || SOCKET_URL;
    const socket = io(externalUrl, {
      path: config.path,
      autoConnect: true,
      withCredentials: false,
      auth: {
        token: config.token,
      },
    });

    return socket;
  }

  await fetch(`${API_URL}/api/socket`, {
    method: "GET",
    cache: "no-store",
  });

  const socket = io(SOCKET_URL || undefined, {
    path: config.path,
    autoConnect: true,
    withCredentials: true,
  });

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
