"use client";

import { io, type Socket } from "socket.io-client";

type WorkspaceSocket = Socket;

let socketPromise: Promise<WorkspaceSocket> | null = null;

async function createSocket() {
  await fetch("/api/socket", {
    method: "GET",
    cache: "no-store",
  });

  const socket = io({
    path: "/api/socket_io",
    autoConnect: true,
    withCredentials: true,
  });

  return socket;
}

export function getWorkspaceSocket() {
  socketPromise ??= createSocket();
  return socketPromise;
}
