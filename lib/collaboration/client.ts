"use client";

import { io, type Socket } from "socket.io-client";

type WorkspaceSocket = Socket;

let socketPromise: Promise<WorkspaceSocket> | null = null;
let activeSocket: WorkspaceSocket | null = null;

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
  const response = await fetch("/api/realtime/token", {
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
    const socket = io(config.url, {
      path: config.path,
      autoConnect: true,
      withCredentials: false,
      auth: {
        token: config.token,
      },
    });

    return socket;
  }

  await fetch("/api/socket", {
    method: "GET",
    cache: "no-store",
  });

  const socket = io({
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
