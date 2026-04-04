import type { Server as HttpServer } from "node:http";
import { getToken } from "next-auth/jwt";
import type { Server as NetServer } from "node:net";
import { Server as SocketIOServer, type Socket } from "socket.io";
import {
  createWorkspaceChatEntry,
  getRealtimeWorkspaceMember,
  recordWorkspacePresenceActivity,
} from "@/app/modules/workspaces/server";
import type {
  FilePushEvent,
  WorkspaceActivity,
  WorkspaceActor,
  WorkspaceChatMessage,
  WorkspaceMemberRoleValue,
  WorkspacePresence,
  WorkspaceTreeUpdateEvent,
  WorkspaceVoiceParticipant,
} from "@/app/modules/workspaces/types";
import {
  getRealtimeServerUrl,
  getRealtimeSharedSecret,
  isExternalRealtimeEnabled,
  REALTIME_INTERNAL_SECRET_HEADER,
  REALTIME_SOCKET_PATH,
} from "./realtime-config";

type SocketServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type RealtimeHttpServer = HttpServer & NetServer;

type AuthenticatedSocketData = {
  user: WorkspaceActor;
  workspaceId: string | null;
};

type PresenceConnection = WorkspacePresence;

type VoiceConnection = WorkspaceVoiceParticipant;

type WorkspaceRoomState = {
  connections: Map<string, PresenceConnection>;
  voiceParticipants: Map<string, VoiceConnection>;
};

type ChatSendAcknowledgement =
  | {
      ok: true;
      message: WorkspaceChatMessage;
    }
  | {
      ok: false;
      error: string;
    };

type ServerToClientEvents = {
  "workspace:presence": (presence: WorkspacePresence[]) => void;
  "workspace:file-pushed": (event: FilePushEvent) => void;
  "workspace:tree-updated": (event: WorkspaceTreeUpdateEvent) => void;
  "workspace:chat:new": (message: WorkspaceChatMessage) => void;
  "workspace:activity:new": (activity: WorkspaceActivity) => void;
  "workspace:members-changed": (payload: { workspaceId: string; reason: string }) => void;
  "voice:participants": (participants: WorkspaceVoiceParticipant[]) => void;
  "voice:participant-joined": (participant: WorkspaceVoiceParticipant) => void;
  "voice:participant-left": (payload: { socketId: string; userId: string }) => void;
  "voice:signal": (payload: {
    workspaceId: string;
    sourceSocketId: string;
    sourceUser: WorkspaceActor & { role: WorkspaceMemberRoleValue };
    signal: unknown;
  }) => void;
  "voice:speaking": (payload: { socketId: string; userId: string; isSpeaking: boolean }) => void;
  "voice:error": (payload: { message: string }) => void;
  "voice:moderated-leave": (payload: { reason: string }) => void;
};

type ClientToServerEvents = {
  "workspace:join": (payload: { workspaceId: string; activeFilePath?: string | null }) => void;
  "workspace:leave": (payload: { workspaceId: string }) => void;
  "workspace:active-file": (payload: { workspaceId: string; activeFilePath?: string | null }) => void;
  "workspace:chat:send": (
    payload: { workspaceId: string; content: string },
    callback: (result: ChatSendAcknowledgement) => void,
  ) => void;
  "voice:join": (payload: { workspaceId: string }) => void;
  "voice:leave": (payload: { workspaceId: string }) => void;
  "voice:signal": (payload: { workspaceId: string; targetSocketId: string; signal: unknown }) => void;
  "voice:speaking": (payload: { workspaceId: string; isSpeaking: boolean }) => void;
};

const globalForRealtime = globalThis as typeof globalThis & {
  __workspaceSocketServer?: SocketServer;
  __workspaceRoomStates?: Map<string, WorkspaceRoomState>;
};

const roomStates = globalForRealtime.__workspaceRoomStates ?? new Map<string, WorkspaceRoomState>();

if (process.env.NODE_ENV !== "production") {
  globalForRealtime.__workspaceRoomStates = roomStates;
}

type ExternalRealtimeEvent =
  | {
      type: "workspace:file-pushed";
      event: FilePushEvent;
    }
  | {
      type: "workspace:tree-updated";
      event: WorkspaceTreeUpdateEvent;
    }
  | {
      type: "workspace:chat:new";
      workspaceId: string;
      message: WorkspaceChatMessage;
    }
  | {
      type: "workspace:activity:new";
      workspaceId: string;
      activity: WorkspaceActivity;
    }
  | {
      type: "workspace:members-changed";
      workspaceId: string;
      reason: string;
    }
  | {
      type: "voice:moderated-leave";
      workspaceId: string;
      userId: string;
      reason: string;
    };

function publishExternalRealtimeEvent(event: ExternalRealtimeEvent) {
  const realtimeUrl = getRealtimeServerUrl();
  const realtimeSecret = getRealtimeSharedSecret();

  if (!realtimeUrl || !realtimeSecret) {
    return;
  }

  void fetch(`${realtimeUrl}/internal/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [REALTIME_INTERNAL_SECRET_HEADER]: realtimeSecret,
    },
    body: JSON.stringify(event),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  }).catch((error) => {
    console.error("Unable to publish realtime event.", error);
  });
}

function getRoomName(workspaceId: string) {
  return `workspace:${workspaceId}`;
}

function getRoomState(workspaceId: string) {
  const existingState = roomStates.get(workspaceId);

  if (existingState) {
    return existingState;
  }

  const nextState: WorkspaceRoomState = {
    connections: new Map(),
    voiceParticipants: new Map(),
  };

  roomStates.set(workspaceId, nextState);
  return nextState;
}

function pruneRoomState(workspaceId: string) {
  const roomState = roomStates.get(workspaceId);

  if (!roomState) {
    return;
  }

  if (!roomState.connections.size && !roomState.voiceParticipants.size) {
    roomStates.delete(workspaceId);
  }
}

function getSocketServer() {
  return globalForRealtime.__workspaceSocketServer ?? null;
}

function getSocketData(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  return socket.data as AuthenticatedSocketData;
}

async function authenticateSocket(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) {
  const token = await getToken({
    req: {
      headers: socket.request.headers as Record<string, string>,
    },
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token?.sub) {
    throw new Error("Unauthorized");
  }

  getSocketData(socket).user = {
    userId: token.sub,
    name:
      (typeof token.name === "string" && token.name.trim()) ||
      (typeof token.email === "string" && token.email.split("@")[0]) ||
      "Collaborator",
    email: typeof token.email === "string" ? token.email : null,
    image: typeof token.picture === "string" ? token.picture : null,
    username:
      typeof token.username === "string"
        ? token.username
        : typeof token.email === "string"
          ? token.email.split("@")[0] ?? null
          : null,
  };
}

async function emitPresenceSnapshot(workspaceId: string) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  const roomState = roomStates.get(workspaceId);

  if (!roomState) {
    io.to(getRoomName(workspaceId)).emit("workspace:presence", []);
    return;
  }

  const snapshot = Array.from(roomState.connections.values());
  io.to(getRoomName(workspaceId)).emit("workspace:presence", snapshot);
}

async function emitVoiceSnapshot(workspaceId: string) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  const roomState = roomStates.get(workspaceId);
  io.to(getRoomName(workspaceId)).emit(
    "voice:participants",
    roomState ? Array.from(roomState.voiceParticipants.values()) : [],
  );
}

async function emitPresenceActivity(params: {
  workspaceId: string;
  userId: string;
  type: "MEMBER_JOINED" | "MEMBER_LEFT" | "FILE_OPENED" | "VOICE_JOINED" | "VOICE_LEFT";
  message: string;
  filePath?: string | null;
  dedupeKey: string;
  dedupeWindowMs?: number;
}) {
  const activity = await recordWorkspacePresenceActivity({
    workspaceLink: params.workspaceId,
    userId: params.userId,
    type: params.type,
    message: params.message,
    filePath: params.filePath,
    dedupeKey: params.dedupeKey,
    dedupeWindowMs: params.dedupeWindowMs,
  });

  if (activity) {
    emitWorkspaceActivity(activity, params.workspaceId);
  }
}

async function handleLeave(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  const socketData = getSocketData(socket);
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

  await emitPresenceSnapshot(workspaceId);

  if (voiceParticipant) {
    socket.to(getRoomName(workspaceId)).emit("voice:participant-left", {
      socketId: socket.id,
      userId: voiceParticipant.userId,
    });
    await emitVoiceSnapshot(workspaceId);
    await emitPresenceActivity({
      workspaceId,
      userId: voiceParticipant.userId,
      type: "VOICE_LEFT",
      message: `${voiceParticipant.name} left voice.`,
      dedupeKey: `voice-left:${voiceParticipant.userId}`,
      dedupeWindowMs: 10_000,
    });
  }

  if (connection) {
    await emitPresenceActivity({
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

async function handleJoin(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  payload: { workspaceId: string; activeFilePath?: string | null },
) {
  const socketData = getSocketData(socket);

  if (socketData.workspaceId && socketData.workspaceId !== payload.workspaceId) {
    await handleLeave(socket);
  }

  const realtimeMember = await getRealtimeWorkspaceMember(
    payload.workspaceId,
    socketData.user.userId,
  );
  const roomState = getRoomState(payload.workspaceId);
  const connection: PresenceConnection = {
    ...realtimeMember.actor,
    socketId: socket.id,
    role: realtimeMember.role,
    activeFilePath: payload.activeFilePath ?? null,
  };

  roomState.connections.set(socket.id, connection);
  socketData.workspaceId = payload.workspaceId;
  socket.join(getRoomName(payload.workspaceId));

  await emitPresenceSnapshot(payload.workspaceId);
  await emitPresenceActivity({
    workspaceId: payload.workspaceId,
    userId: connection.userId,
    type: "MEMBER_JOINED",
    message: `${connection.name} joined the workspace.`,
    dedupeKey: `member-joined:${connection.userId}`,
    dedupeWindowMs: 10_000,
  });

  if (connection.activeFilePath) {
    await emitPresenceActivity({
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

async function handleActiveFile(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  payload: { workspaceId: string; activeFilePath?: string | null },
) {
  const socketData = getSocketData(socket);

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
  await emitPresenceSnapshot(payload.workspaceId);

  if (connection.activeFilePath) {
    await emitPresenceActivity({
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

function createSocketServer(httpServer: RealtimeHttpServer) {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: REALTIME_SOCKET_PATH,
    addTrailingSlash: false,
  });

  io.use((socket, next) => {
    void authenticateSocket(socket)
      .then(() => next())
      .catch((error) => next(error));
  });

  io.on("connection", (socket) => {
    socket.on("workspace:join", (payload) => {
      void handleJoin(socket, payload).catch((error) => {
        socket.emit("voice:error", {
          message: error instanceof Error ? error.message : "Unable to join the workspace room.",
        });
      });
    });

    socket.on("workspace:leave", () => {
      void handleLeave(socket);
    });

    socket.on("workspace:active-file", (payload) => {
      void handleActiveFile(socket, payload);
    });

    socket.on("workspace:chat:send", (payload, callback) => {
      void (async () => {
        const socketData = getSocketData(socket);

        if (socketData.workspaceId !== payload.workspaceId) {
          callback({
            ok: false,
            error: "Join the workspace before sending chat messages.",
          });
          return;
        }

        const message = await createWorkspaceChatEntry({
          workspaceLink: payload.workspaceId,
          content: payload.content,
          user: socketData.user,
        });

        emitWorkspaceChat(message, payload.workspaceId);
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
        const socketData = getSocketData(socket);

        if (socketData.workspaceId !== payload.workspaceId) {
          return;
        }

        const realtimeMember = await getRealtimeWorkspaceMember(
          payload.workspaceId,
          socketData.user.userId,
        );

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

        const participant: VoiceConnection = {
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
        await emitVoiceSnapshot(payload.workspaceId);
        await emitPresenceActivity({
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
        await emitVoiceSnapshot(payload.workspaceId);
        await emitPresenceActivity({
          workspaceId: payload.workspaceId,
          userId: participant.userId,
          type: "VOICE_LEFT",
          message: `${participant.name} left voice.`,
          dedupeKey: `voice-left:${participant.userId}`,
          dedupeWindowMs: 10_000,
        });
      })();
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
      void handleLeave(socket);
    });
  });

  return io;
}

export function attachWorkspaceRealtimeServer(
  httpServer: RealtimeHttpServer,
) {
  if (isExternalRealtimeEnabled()) {
    return null;
  }

  const existingServer = getSocketServer();

  if (existingServer) {
    return existingServer;
  }

  const nextServer = createSocketServer(httpServer);
  globalForRealtime.__workspaceSocketServer = nextServer;
  return nextServer;
}

export function emitWorkspaceFilePush(event: FilePushEvent) {
  if (isExternalRealtimeEnabled()) {
    publishExternalRealtimeEvent({
      type: "workspace:file-pushed",
      event,
    });
    return;
  }

  const io = getSocketServer();
  io?.to(getRoomName(event.workspaceId)).emit("workspace:file-pushed", event);
}

export function emitWorkspaceTreeUpdate(event: WorkspaceTreeUpdateEvent) {
  if (isExternalRealtimeEnabled()) {
    publishExternalRealtimeEvent({
      type: "workspace:tree-updated",
      event,
    });
    return;
  }

  const io = getSocketServer();
  io?.to(getRoomName(event.workspaceId)).emit("workspace:tree-updated", event);
}

export function emitWorkspaceChat(message: WorkspaceChatMessage, workspaceId: string) {
  if (isExternalRealtimeEnabled()) {
    publishExternalRealtimeEvent({
      type: "workspace:chat:new",
      workspaceId,
      message,
    });
    return;
  }

  const io = getSocketServer();
  io?.to(getRoomName(workspaceId)).emit("workspace:chat:new", message);
}

export function emitWorkspaceActivity(activity: WorkspaceActivity, workspaceId: string) {
  if (isExternalRealtimeEnabled()) {
    publishExternalRealtimeEvent({
      type: "workspace:activity:new",
      workspaceId,
      activity,
    });
    return;
  }

  const io = getSocketServer();
  io?.to(getRoomName(workspaceId)).emit("workspace:activity:new", activity);
}

export function emitWorkspaceMembersChanged(workspaceId: string, reason: string) {
  if (isExternalRealtimeEnabled()) {
    publishExternalRealtimeEvent({
      type: "workspace:members-changed",
      workspaceId,
      reason,
    });
    return;
  }

  const io = getSocketServer();
  io?.to(getRoomName(workspaceId)).emit("workspace:members-changed", {
    workspaceId,
    reason,
  });
}

export function enforceVoiceModeration(params: {
  workspaceId: string;
  userId: string;
  reason: string;
}) {
  if (isExternalRealtimeEnabled()) {
    publishExternalRealtimeEvent({
      type: "voice:moderated-leave",
      workspaceId: params.workspaceId,
      userId: params.userId,
      reason: params.reason,
    });
    return;
  }

  const io = getSocketServer();
  const roomState = roomStates.get(params.workspaceId);

  if (!io || !roomState) {
    return;
  }

  for (const participant of roomState.voiceParticipants.values()) {
    if (participant.userId !== params.userId) {
      continue;
    }

    roomState.voiceParticipants.delete(participant.socketId);
    io.to(participant.socketId).emit("voice:moderated-leave", {
      reason: params.reason,
    });
    io.to(getRoomName(params.workspaceId)).emit("voice:participant-left", {
      socketId: participant.socketId,
      userId: participant.userId,
    });
  }

  io.to(getRoomName(params.workspaceId)).emit(
    "voice:participants",
    Array.from(roomState.voiceParticipants.values()),
  );
}
