import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";

const port = Number.parseInt(process.env.PORT ?? "10000", 10);
const appOrigin = process.env.APP_ORIGIN?.trim();
const realtimeSecret = process.env.REALTIME_SHARED_SECRET?.trim();
const socketPath = process.env.REALTIME_SOCKET_PATH?.trim() || "/api/socket_io";
const internalSecretHeader = "x-realtime-secret";

if (!appOrigin) {
  throw new Error("APP_ORIGIN is required.");
}

if (!realtimeSecret) {
  throw new Error("REALTIME_SHARED_SECRET is required.");
}

const roomStates = new Map();

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyRealtimeToken(token) {
  if (!token) {
    throw new Error("Missing realtime token.");
  }

  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new Error("Malformed realtime token.");
  }

  const expectedSignature = encodeBase64Url(
    createHmac("sha256", realtimeSecret).update(`${header}.${payload}`).digest(),
  );

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error("Invalid realtime token signature.");
  }

  const decodedPayload = JSON.parse(decodeBase64Url(payload).toString("utf8"));

  if (
    !decodedPayload ||
    typeof decodedPayload !== "object" ||
    typeof decodedPayload.sub !== "string" ||
    typeof decodedPayload.name !== "string" ||
    typeof decodedPayload.exp !== "number"
  ) {
    throw new Error("Invalid realtime token payload.");
  }

  if (decodedPayload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Realtime token has expired.");
  }

  return {
    userId: decodedPayload.sub,
    name: decodedPayload.name,
    email: typeof decodedPayload.email === "string" ? decodedPayload.email : null,
    image: typeof decodedPayload.image === "string" ? decodedPayload.image : null,
    username: typeof decodedPayload.username === "string" ? decodedPayload.username : null,
  };
}

function getRoomName(workspaceId) {
  return `workspace:${workspaceId}`;
}

function getRoomState(workspaceId) {
  const existingState = roomStates.get(workspaceId);

  if (existingState) {
    return existingState;
  }

  const nextState = {
    connections: new Map(),
    voiceParticipants: new Map(),
  };

  roomStates.set(workspaceId, nextState);
  return nextState;
}

function pruneRoomState(workspaceId) {
  const roomState = roomStates.get(workspaceId);

  if (!roomState) {
    return;
  }

  if (!roomState.connections.size && !roomState.voiceParticipants.size) {
    roomStates.delete(workspaceId);
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function hasInternalAccess(request) {
  const providedSecret = request.headers[internalSecretHeader];

  return (
    typeof providedSecret === "string" &&
    providedSecret.length > 0 &&
    safeEqual(providedSecret, realtimeSecret)
  );
}

async function callWorkspaceAction(workspaceId, body) {
  const response = await fetch(
    new URL(
      `/api/internal/realtime/workspaces/${encodeURIComponent(workspaceId)}`,
      appOrigin,
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [internalSecretHeader]: realtimeSecret,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Workspace realtime request failed.";

    throw new Error(message);
  }

  return payload;
}

function emitWorkspaceActivity(io, activity, workspaceId) {
  io.to(getRoomName(workspaceId)).emit("workspace:activity:new", activity);
}

function emitPresenceSnapshot(io, workspaceId) {
  const roomState = roomStates.get(workspaceId);
  io.to(getRoomName(workspaceId)).emit(
    "workspace:presence",
    roomState ? Array.from(roomState.connections.values()) : [],
  );
}

function emitVoiceSnapshot(io, workspaceId) {
  const roomState = roomStates.get(workspaceId);
  io.to(getRoomName(workspaceId)).emit(
    "voice:participants",
    roomState ? Array.from(roomState.voiceParticipants.values()) : [],
  );
}

async function emitPresenceActivity(io, params) {
  try {
    const activity = await callWorkspaceAction(params.workspaceId, {
      action: "activity",
      userId: params.userId,
      type: params.type,
      message: params.message,
      filePath: params.filePath ?? null,
      dedupeKey: params.dedupeKey,
      dedupeWindowMs: params.dedupeWindowMs,
    });

    if (activity) {
      emitWorkspaceActivity(io, activity, params.workspaceId);
    }
  } catch (error) {
    console.error("Unable to record realtime activity.", error);
  }
}

async function handleLeave(io, socket) {
  const socketData = socket.data;
  const workspaceId = socketData.workspaceId;

  if (!workspaceId) {
    return;
  }

  const roomState = roomStates.get(workspaceId);

  if (!roomState) {
    socketData.workspaceId = null;
    return;
  }

  const connection = roomState.connections.get(socket.id);
  const voiceParticipant = roomState.voiceParticipants.get(socket.id);

  roomState.connections.delete(socket.id);
  roomState.voiceParticipants.delete(socket.id);
  socket.leave(getRoomName(workspaceId));
  socketData.workspaceId = null;

  emitPresenceSnapshot(io, workspaceId);

  if (voiceParticipant) {
    socket.to(getRoomName(workspaceId)).emit("voice:participant-left", {
      socketId: socket.id,
      userId: voiceParticipant.userId,
    });
    emitVoiceSnapshot(io, workspaceId);
    await emitPresenceActivity(io, {
      workspaceId,
      userId: voiceParticipant.userId,
      type: "VOICE_LEFT",
      message: `${voiceParticipant.name} left voice.`,
      dedupeKey: `voice-left:${voiceParticipant.userId}`,
      dedupeWindowMs: 10_000,
    });
  }

  if (connection) {
    await emitPresenceActivity(io, {
      workspaceId,
      userId: connection.userId,
      type: "MEMBER_LEFT",
      message: `${connection.name} left the workspace.`,
      dedupeKey: `member-left:${connection.userId}`,
      dedupeWindowMs: 10_000,
    });
  }

  pruneRoomState(workspaceId);
}

async function handleJoin(io, socket, payload) {
  const socketData = socket.data;

  if (socketData.workspaceId && socketData.workspaceId !== payload.workspaceId) {
    await handleLeave(io, socket);
  }

  const realtimeMember = await callWorkspaceAction(payload.workspaceId, {
    action: "member",
    userId: socketData.user.userId,
  });
  const roomState = getRoomState(payload.workspaceId);
  const connection = {
    ...realtimeMember.actor,
    socketId: socket.id,
    role: realtimeMember.role,
    activeFilePath: payload.activeFilePath ?? null,
  };

  roomState.connections.set(socket.id, connection);
  socketData.workspaceId = payload.workspaceId;
  socket.join(getRoomName(payload.workspaceId));

  emitPresenceSnapshot(io, payload.workspaceId);
  await emitPresenceActivity(io, {
    workspaceId: payload.workspaceId,
    userId: connection.userId,
    type: "MEMBER_JOINED",
    message: `${connection.name} joined the workspace.`,
    dedupeKey: `member-joined:${connection.userId}`,
    dedupeWindowMs: 10_000,
  });

  if (connection.activeFilePath) {
    await emitPresenceActivity(io, {
      workspaceId: payload.workspaceId,
      userId: connection.userId,
      type: "FILE_OPENED",
      message: `${connection.name} opened ${connection.activeFilePath}.`,
      filePath: connection.activeFilePath,
      dedupeKey: `file-open:${connection.userId}:${connection.activeFilePath}`,
      dedupeWindowMs: 15_000,
    });
  }
}

async function handleActiveFile(io, socket, payload) {
  const socketData = socket.data;

  if (socketData.workspaceId !== payload.workspaceId) {
    return;
  }

  const roomState = roomStates.get(payload.workspaceId);
  const connection = roomState?.connections.get(socket.id);

  if (!roomState || !connection) {
    return;
  }

  connection.activeFilePath = payload.activeFilePath ?? null;
  roomState.connections.set(socket.id, connection);
  emitPresenceSnapshot(io, payload.workspaceId);

  if (connection.activeFilePath) {
    await emitPresenceActivity(io, {
      workspaceId: payload.workspaceId,
      userId: connection.userId,
      type: "FILE_OPENED",
      message: `${connection.name} opened ${connection.activeFilePath}.`,
      filePath: connection.activeFilePath,
      dedupeKey: `file-open:${connection.userId}:${connection.activeFilePath}`,
      dedupeWindowMs: 15_000,
    });
  }
}

function handleInternalEvent(io, payload) {
  if (!payload || typeof payload !== "object" || typeof payload.type !== "string") {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid realtime event payload.",
    };
  }

  switch (payload.type) {
    case "workspace:file-pushed":
      io.to(getRoomName(payload.event.workspaceId)).emit("workspace:file-pushed", payload.event);
      return { ok: true, statusCode: 200, message: "published" };
    case "workspace:tree-updated":
      io.to(getRoomName(payload.event.workspaceId)).emit("workspace:tree-updated", payload.event);
      return { ok: true, statusCode: 200, message: "published" };
    case "workspace:chat:new":
      io.to(getRoomName(payload.workspaceId)).emit("workspace:chat:new", payload.message);
      return { ok: true, statusCode: 200, message: "published" };
    case "workspace:activity:new":
      io.to(getRoomName(payload.workspaceId)).emit("workspace:activity:new", payload.activity);
      return { ok: true, statusCode: 200, message: "published" };
    case "workspace:members-changed":
      io.to(getRoomName(payload.workspaceId)).emit("workspace:members-changed", {
        workspaceId: payload.workspaceId,
        reason: payload.reason,
      });
      return { ok: true, statusCode: 200, message: "published" };
    case "voice:moderated-leave": {
      const roomState = roomStates.get(payload.workspaceId);

      if (!roomState) {
        return { ok: true, statusCode: 200, message: "noop" };
      }

      for (const participant of roomState.voiceParticipants.values()) {
        if (participant.userId !== payload.userId) {
          continue;
        }

        roomState.voiceParticipants.delete(participant.socketId);
        io.to(participant.socketId).emit("voice:moderated-leave", {
          reason: payload.reason,
        });
        io.to(getRoomName(payload.workspaceId)).emit("voice:participant-left", {
          socketId: participant.socketId,
          userId: participant.userId,
        });
      }

      emitVoiceSnapshot(io, payload.workspaceId);
      return { ok: true, statusCode: 200, message: "published" };
    }
    default:
      return {
        ok: false,
        statusCode: 400,
        message: "Unsupported realtime event type.",
      };
  }
}

const httpServer = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/") {
    sendJson(response, 200, {
      ok: true,
      service: "code-collab-realtime",
      socketPath,
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/internal/events") {
    if (!hasInternalAccess(request)) {
      sendJson(response, 401, { error: "Unauthorized realtime event request." });
      return;
    }

    try {
      const payload = await readJson(request);
      const result = handleInternalEvent(io, payload);
      sendJson(response, result.statusCode, { ok: result.ok, message: result.message });
    } catch (error) {
      console.error("Unable to handle internal realtime event.", error);
      sendJson(response, 500, { error: "Unable to handle realtime event." });
    }

    return;
  }

  sendJson(response, 404, { error: "Not found." });
});

const io = new SocketIOServer(httpServer, {
  path: socketPath,
  addTrailingSlash: false,
  cors: {
    origin: appOrigin,
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  try {
    socket.data.user = verifyRealtimeToken(socket.handshake.auth?.token);
    socket.data.workspaceId = null;
    next();
  } catch (error) {
    next(error);
  }
});

io.on("connection", (socket) => {
  socket.on("workspace:join", (payload) => {
    void handleJoin(io, socket, payload).catch((error) => {
      socket.emit("voice:error", {
        message: error instanceof Error ? error.message : "Unable to join the workspace room.",
      });
    });
  });

  socket.on("workspace:leave", () => {
    void handleLeave(io, socket);
  });

  socket.on("workspace:active-file", (payload) => {
    void handleActiveFile(io, socket, payload);
  });

  socket.on("workspace:chat:send", (payload, callback) => {
    void (async () => {
      const socketData = socket.data;

      if (socketData.workspaceId !== payload.workspaceId) {
        callback({
          ok: false,
          error: "Join the workspace before sending chat messages.",
        });
        return;
      }

      const message = await callWorkspaceAction(payload.workspaceId, {
        action: "chat",
        content: payload.content,
        user: socketData.user,
      });

      io.to(getRoomName(payload.workspaceId)).emit("workspace:chat:new", message);
      callback({
        ok: true,
        message,
      });
    })().catch((error) => {
      callback({
        ok: false,
        error: error instanceof Error ? error.message : "Unable to send that message.",
      });
    });
  });

  socket.on("voice:join", (payload) => {
    void (async () => {
      const socketData = socket.data;

      if (socketData.workspaceId !== payload.workspaceId) {
        return;
      }

      const realtimeMember = await callWorkspaceAction(payload.workspaceId, {
        action: "member",
        userId: socketData.user.userId,
      });

      if (realtimeMember.isVoiceMuted) {
        socket.emit("voice:error", {
          message: "A workspace moderator has muted your voice access.",
        });
        return;
      }

      const roomState = getRoomState(payload.workspaceId);

      if (roomState.voiceParticipants.has(socket.id)) {
        return;
      }

      const participant = {
        ...realtimeMember.actor,
        socketId: socket.id,
        role: realtimeMember.role,
        isSpeaking: false,
        isMutedByModerator: false,
      };

      const existingParticipants = Array.from(roomState.voiceParticipants.values());
      roomState.voiceParticipants.set(socket.id, participant);

      socket.emit("voice:participants", existingParticipants);
      socket.to(getRoomName(payload.workspaceId)).emit("voice:participant-joined", participant);
      emitVoiceSnapshot(io, payload.workspaceId);
      await emitPresenceActivity(io, {
        workspaceId: payload.workspaceId,
        userId: participant.userId,
        type: "VOICE_JOINED",
        message: `${participant.name} joined voice.`,
        dedupeKey: `voice-joined:${participant.userId}`,
        dedupeWindowMs: 10_000,
      });
    })().catch((error) => {
      socket.emit("voice:error", {
        message: error instanceof Error ? error.message : "Unable to join voice.",
      });
    });
  });

  socket.on("voice:leave", (payload) => {
    void (async () => {
      const roomState = roomStates.get(payload.workspaceId);
      const participant = roomState?.voiceParticipants.get(socket.id);

      if (!roomState || !participant) {
        return;
      }

      roomState.voiceParticipants.delete(socket.id);
      socket.to(getRoomName(payload.workspaceId)).emit("voice:participant-left", {
        socketId: socket.id,
        userId: participant.userId,
      });
      emitVoiceSnapshot(io, payload.workspaceId);
      await emitPresenceActivity(io, {
        workspaceId: payload.workspaceId,
        userId: participant.userId,
        type: "VOICE_LEFT",
        message: `${participant.name} left voice.`,
        dedupeKey: `voice-left:${participant.userId}`,
        dedupeWindowMs: 10_000,
      });
    })().catch((error) => {
      console.error("Unable to process voice leave.", error);
    });
  });

  socket.on("voice:signal", (payload) => {
    const roomState = roomStates.get(payload.workspaceId);
    const sourceParticipant = roomState?.voiceParticipants.get(socket.id);
    const targetParticipant = roomState?.voiceParticipants.get(payload.targetSocketId);

    if (!sourceParticipant || !targetParticipant) {
      return;
    }

    socket.to(payload.targetSocketId).emit("voice:signal", {
      workspaceId: payload.workspaceId,
      sourceSocketId: socket.id,
      sourceUser: {
        ...sourceParticipant,
        role: sourceParticipant.role,
      },
      signal: payload.signal,
    });
  });

  socket.on("voice:speaking", (payload) => {
    const roomState = roomStates.get(payload.workspaceId);
    const participant = roomState?.voiceParticipants.get(socket.id);

    if (!roomState || !participant) {
      return;
    }

    participant.isSpeaking = payload.isSpeaking;
    roomState.voiceParticipants.set(socket.id, participant);
    socket.to(getRoomName(payload.workspaceId)).emit("voice:speaking", {
      socketId: socket.id,
      userId: participant.userId,
      isSpeaking: payload.isSpeaking,
    });
  });

  socket.on("disconnect", () => {
    void handleLeave(io, socket);
  });
});

httpServer.listen(port, () => {
  console.log(
    `Realtime server listening on port ${port} for ${appOrigin} using path ${socketPath}`,
  );
});
