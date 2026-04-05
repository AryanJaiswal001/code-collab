"use client";

import { io, type Socket } from "socket.io-client";

type WorkspaceSocket = Socket;

let socketPromise: Promise<WorkspaceSocket> | null = null;
let activeSocket: WorkspaceSocket | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || "";
const SOCKET_CONFIG_MAX_ATTEMPTS = 5;
const SOCKET_CONFIG_INITIAL_BACKOFF_MS = 750;
const SOCKET_COLD_START_DELAY_MS = 500;

if (!SOCKET_URL) {
  console.warn("NEXT_PUBLIC_SOCKET_URL is not set. Falling back to runtime config URL.");
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
  const response = await fetch("/api/realtime/token", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error || "Unable to prepare the realtime connection.",
    );
  }

  return (await response.json()) as RealtimeConnectionConfig;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function getRealtimeConnectionConfigWithRetry() {
  let backoffMs = SOCKET_CONFIG_INITIAL_BACKOFF_MS;

  for (let attempt = 1; attempt <= SOCKET_CONFIG_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await getRealtimeConnectionConfig();
    } catch (error) {
      if (attempt === SOCKET_CONFIG_MAX_ATTEMPTS) {
        throw error;
      }

      console.warn(
        `[realtime] Failed to load connection config (attempt ${attempt}/${SOCKET_CONFIG_MAX_ATTEMPTS}). Retrying in ${backoffMs}ms.`,
        error,
      );
      await delay(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 5_000);
    }
  }

  throw new Error("Unable to prepare the realtime connection.");
}

function resolveSocketEndpoint(config: RealtimeConnectionConfig) {
  if (SOCKET_URL) {
    return SOCKET_URL;
  }

  if (config.mode === "external") {
    return config.url;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

async function createSocket() {
  const config = await getRealtimeConnectionConfigWithRetry();
  const socketEndpoint = resolveSocketEndpoint(config);

  if (!socketEndpoint) {
    throw new Error("Unable to determine realtime socket URL.");
  }

  const socket = io(socketEndpoint, {
    path: config.path || "/api/socket_io",
    transports: ["websocket"],
    secure: true,
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
    timeout: 20_000,
    auth: {
      token: config.mode === "external" ? config.token : undefined,
    },
  });

  socket.on("connect", () => {
    console.info(`[realtime] Connected with socket id ${socket.id}.`);
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[realtime] Disconnected (${reason}).`);
  });

  socket.on("connect_error", (error) => {
    console.error("[realtime] Connection error.", error);
  });

  socket.io.on("reconnect_attempt", (attempt) => {
    console.info(`[realtime] Reconnect attempt ${attempt}.`);
  });

  socket.io.on("reconnect", (attempt) => {
    console.info(`[realtime] Reconnected after ${attempt} attempt(s).`);
  });

  socket.io.on("reconnect_error", (error) => {
    console.error("[realtime] Reconnect error.", error);
  });

  socket.io.on("reconnect_failed", () => {
    console.error("[realtime] Reconnect failed after maximum attempts.");
  });

  await delay(SOCKET_COLD_START_DELAY_MS);
  socket.connect();

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
