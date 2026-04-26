"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type {
  WorkspaceCurrentUser,
  WorkspaceVoiceParticipant,
} from "@/app/modules/workspaces/types";

type VoiceSignal =
  | {
      type: "offer" | "answer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "ice-candidate";
      candidate: RTCIceCandidateInit;
    };

export type VoiceConnectionStatus =
  | "idle"
  | "requesting-microphone"
  | "connecting"
  | "connected"
  | "failed";

type VoiceSignalPayload = {
  sourceSocketId: string;
  sourceUser?: WorkspaceVoiceParticipant;
  signal: VoiceSignal;
};

type RemoteAudioState = {
  participant: WorkspaceVoiceParticipant;
  stream: MediaStream | null;
};

type UseWorkspaceVoiceParams = {
  workspaceId: string;
  currentUser: WorkspaceCurrentUser;
  socket: Socket | null;
};

function createPeerConnection(params: {
  socket: Socket;
  workspaceId: string;
  targetSocketId: string;
  localStream: MediaStream;
  onRemoteStream: (socketId: string, stream: MediaStream) => void;
  onConnectionStatusChange: (status: VoiceConnectionStatus) => void;
}) {
  const peer = new RTCPeerConnection({
    iceServers: [
      {
        urls: ["stun:stun.l.google.com:19302"],
      },
    ],
  });

  for (const track of params.localStream.getTracks()) {
    peer.addTrack(track, params.localStream);
  }
  console.debug(
    "[voice] Added local audio tracks to peer connection.",
    params.targetSocketId,
    params.localStream.getAudioTracks().length,
  );

  peer.onicecandidate = (event) => {
    if (!event.candidate) {
      return;
    }

    console.debug("[voice] Sending ICE candidate.", params.targetSocketId);
    params.socket.emit("voice:signal", {
      workspaceId: params.workspaceId,
      targetSocketId: params.targetSocketId,
      signal: {
        type: "ice-candidate",
        candidate: event.candidate.toJSON(),
      } satisfies VoiceSignal,
    });
  };

  peer.ontrack = (event) => {
    const [stream] = event.streams;
    const hasAudioTrack = Boolean(stream?.getAudioTracks().length);

    if (stream && hasAudioTrack) {
      console.debug(
        "[voice] Remote audio track received.",
        params.targetSocketId,
        stream.getAudioTracks().length,
      );
      params.onRemoteStream(params.targetSocketId, stream);
    }
  };

  peer.onconnectionstatechange = () => {
    console.debug(
      "[voice] Peer connection state changed.",
      params.targetSocketId,
      peer.connectionState,
    );

    if (peer.connectionState === "connected") {
      params.onConnectionStatusChange("connected");
      return;
    }

    if (
      peer.connectionState === "failed" ||
      peer.connectionState === "disconnected"
    ) {
      params.onConnectionStatusChange("failed");
    }
  };

  peer.oniceconnectionstatechange = () => {
    console.debug(
      "[voice] ICE connection state changed.",
      params.targetSocketId,
      peer.iceConnectionState,
    );
  };

  return peer;
}

function getMicrophoneErrorMessage(error: unknown) {
  if (!(error instanceof DOMException || error instanceof Error)) {
    return "Unable to access your microphone.";
  }

  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Microphone permission was denied. Allow microphone access in your browser settings and try again.";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No microphone was found on this device.";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Your microphone is already in use or could not be started.";
  }

  return error.message || "Unable to access your microphone.";
}

const globalVoiceState = {
  localStream: null as MediaStream | null,
  peerConnections: new Map<string, RTCPeerConnection>(),
  pendingIceCandidates: new Map<string, RTCIceCandidateInit[]>(),
  remoteStreams: new Map<string, MediaStream>(),
  speakingFrame: null as number | null,
  audioContext: null as AudioContext | null,
  analyser: null as AnalyserNode | null,
  lastSpeakingState: false,
  participants: [] as WorkspaceVoiceParticipant[],
  isSelfMuted: false,
};

export function useWorkspaceVoice({
  workspaceId,
  currentUser,
  socket,
}: UseWorkspaceVoiceParams) {
  const [isVoiceJoined, setIsVoiceJoined] = useState(
    !!globalVoiceState.localStream,
  );
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);
  const [isSelfMuted, setIsSelfMuted] = useState(globalVoiceState.isSelfMuted);
  const [isListeningForSound, setIsListeningForSound] = useState(
    !!globalVoiceState.analyser,
  );
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<VoiceConnectionStatus>(
      globalVoiceState.localStream ? "connected" : "idle",
    );
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<WorkspaceVoiceParticipant[]>(
    [],
  );
  const [remoteAudio, setRemoteAudio] = useState<RemoteAudioState[]>([]);

  // Use a global singleton object to persist state across unmounts/tab visibility changes
  const localStreamRef = {
    get current() {
      return globalVoiceState.localStream;
    },
    set current(v) {
      globalVoiceState.localStream = v;
    },
  };
  const peerConnectionsRef = {
    get current() {
      return globalVoiceState.peerConnections;
    },
    set current(v) {
      globalVoiceState.peerConnections = v;
    },
  };
  const pendingIceCandidatesRef = {
    get current() {
      return globalVoiceState.pendingIceCandidates;
    },
    set current(v) {
      globalVoiceState.pendingIceCandidates = v;
    },
  };
  const remoteStreamsRef = {
    get current() {
      return globalVoiceState.remoteStreams;
    },
    set current(v) {
      globalVoiceState.remoteStreams = v;
    },
  };
  const speakingFrameRef = {
    get current() {
      return globalVoiceState.speakingFrame;
    },
    set current(v) {
      globalVoiceState.speakingFrame = v;
    },
  };
  const audioContextRef = {
    get current() {
      return globalVoiceState.audioContext;
    },
    set current(v) {
      globalVoiceState.audioContext = v;
    },
  };
  const analyserRef = {
    get current() {
      return globalVoiceState.analyser;
    },
    set current(v) {
      globalVoiceState.analyser = v;
    },
  };
  const lastSpeakingStateRef = {
    get current() {
      return globalVoiceState.lastSpeakingState;
    },
    set current(v) {
      globalVoiceState.lastSpeakingState = v;
    },
  };
  const participantsRef = {
    get current() {
      return globalVoiceState.participants;
    },
    set current(v) {
      globalVoiceState.participants = v;
    },
  };
  const isSelfMutedRef = {
    get current() {
      return globalVoiceState.isSelfMuted;
    },
    set current(v) {
      globalVoiceState.isSelfMuted = v;
    },
  };

  useEffect(() => {
    participantsRef.current = participants;
    setRemoteAudio(() =>
      Array.from(remoteStreamsRef.current.entries()).flatMap(
        ([socketId, stream]) => {
          const participant = participants.find(
            (item) => item.socketId === socketId,
          );

          return participant ? [{ participant, stream }] : [];
        },
      ),
    );
  }, [participants]);

  useEffect(() => {
    isSelfMutedRef.current = isSelfMuted;
  }, [isSelfMuted]);

  const updateRemoteStream = useCallback(
    (socketId: string, stream: MediaStream) => {
      remoteStreamsRef.current.set(socketId, stream);
      setRemoteAudio((currentAudio) => {
        const nextAudio = currentAudio.filter(
          (item) => item.participant.socketId !== socketId,
        );
        const participant = participantsRef.current.find(
          (item) => item.socketId === socketId,
        );

        if (!participant) {
          console.debug(
            "[voice] Remote stream arrived before participant metadata.",
            socketId,
          );
          return currentAudio;
        }

        return [...nextAudio, { participant, stream }];
      });
    },
    [],
  );

  const cleanupVoice = useCallback(() => {
    if (speakingFrameRef.current) {
      window.clearTimeout(speakingFrameRef.current);
      speakingFrameRef.current = null;
    }

    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    lastSpeakingStateRef.current = false;
    setIsListeningForSound(false);
    setLocalAudioLevel(0);

    for (const peer of peerConnectionsRef.current.values()) {
      peer.close();
    }

    peerConnectionsRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    remoteStreamsRef.current.clear();
    setRemoteAudio([]);

    for (const track of localStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    localStreamRef.current = null;
    setConnectionStatus("idle");
  }, []);

  const ensurePeerConnection = useCallback(
    (targetSocketId: string) => {
      if (!socket || !localStreamRef.current) {
        return null;
      }

      const existingPeer = peerConnectionsRef.current.get(targetSocketId);

      if (existingPeer) {
        return existingPeer;
      }

      const peer = createPeerConnection({
        socket,
        workspaceId,
        targetSocketId,
        localStream: localStreamRef.current,
        onRemoteStream: updateRemoteStream,
        onConnectionStatusChange: setConnectionStatus,
      });

      console.debug("[voice] Created peer connection.", targetSocketId);
      peerConnectionsRef.current.set(targetSocketId, peer);
      return peer;
    },
    [socket, updateRemoteStream, workspaceId],
  );

  const createOfferForParticipant = useCallback(
    async (targetSocketId: string) => {
      const peer = ensurePeerConnection(targetSocketId);

      if (!peer || !socket) {
        return;
      }

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.debug("[voice] Sending offer.", targetSocketId);
      socket.emit("voice:signal", {
        workspaceId,
        targetSocketId,
        signal: {
          type: "offer",
          sdp: offer,
        } satisfies VoiceSignal,
      });
    },
    [ensurePeerConnection, socket, workspaceId],
  );

  const flushPendingIceCandidates = useCallback(async (socketId: string) => {
    const peer = peerConnectionsRef.current.get(socketId);
    const candidates = pendingIceCandidatesRef.current.get(socketId);

    if (!peer || !peer.remoteDescription || !candidates?.length) {
      return;
    }

    pendingIceCandidatesRef.current.delete(socketId);

    for (const candidate of candidates) {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }

    console.debug(
      "[voice] Applied queued ICE candidates.",
      socketId,
      candidates.length,
    );
  }, []);

  const startSpeakingDetector = useCallback(() => {
    if (!localStreamRef.current || !socket) {
      return;
    }

    if (speakingFrameRef.current) {
      window.clearTimeout(speakingFrameRef.current);
      speakingFrameRef.current = null;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(localStreamRef.current);
    const buffer = new Uint8Array(analyser.fftSize);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    setIsListeningForSound(true);
    void audioContext.resume().catch(() => undefined);

    const tick = () => {
      if (!analyserRef.current || !socket) {
        return;
      }

      analyserRef.current.getByteTimeDomainData(buffer);
      const average =
        buffer.reduce((total, value) => total + Math.abs(value - 128), 0) /
        buffer.length;
      const isSpeaking = !isSelfMutedRef.current && average > 8;
      const nextAudioLevel = isSelfMutedRef.current
        ? 0
        : Math.min(1, average / 24);

      setLocalAudioLevel(nextAudioLevel);

      if (isSpeaking !== lastSpeakingStateRef.current) {
        lastSpeakingStateRef.current = isSpeaking;
        setParticipants((currentParticipants) =>
          currentParticipants.map((participant) =>
            participant.userId === currentUser.userId
              ? { ...participant, isSpeaking }
              : participant,
          ),
        );
        socket.emit("voice:speaking", {
          workspaceId,
          isSpeaking,
        });
      }

      // Use setTimeout instead of requestAnimationFrame so it runs in hidden tabs
      speakingFrameRef.current = window.setTimeout(
        tick,
        100,
      ) as unknown as number;
    };

    speakingFrameRef.current = window.setTimeout(
      tick,
      100,
    ) as unknown as number;
  }, [currentUser.userId, socket, workspaceId]);

  const joinVoice = useCallback(async () => {
    if (!socket || isJoiningVoice || localStreamRef.current) {
      return;
    }

    setIsJoiningVoice(true);
    setConnectionStatus("requesting-microphone");
    setVoiceError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone capture is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      console.debug(
        "[voice] Local microphone stream captured.",
        stream.getAudioTracks().map((track) => ({
          enabled: track.enabled,
          id: track.id,
          label: track.label,
          muted: track.muted,
          readyState: track.readyState,
        })),
      );
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isSelfMutedRef.current;
      });

      setConnectionStatus("connecting");
      setIsVoiceJoined(true);
      socket.emit("voice:join", {
        workspaceId,
      });

      startSpeakingDetector();
    } catch (error) {
      setVoiceError(getMicrophoneErrorMessage(error));
      cleanupVoice();
      setConnectionStatus("failed");
    } finally {
      setIsJoiningVoice(false);
    }
  }, [
    cleanupVoice,
    isJoiningVoice,
    socket,
    startSpeakingDetector,
    workspaceId,
  ]);

  const leaveVoice = useCallback(() => {
    if (socket) {
      socket.emit("voice:leave", {
        workspaceId,
      });
      socket.emit("voice:speaking", {
        workspaceId,
        isSpeaking: false,
      });
    }

    cleanupVoice();
    setIsVoiceJoined(false);
    setParticipants((currentParticipants) =>
      currentParticipants.filter(
        (participant) => participant.userId !== currentUser.userId,
      ),
    );
  }, [cleanupVoice, currentUser.userId, socket, workspaceId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const activeSocket = socket;
    const shouldInitiateOffer = (targetSocketId: string) =>
      Boolean(activeSocket.id) && (activeSocket.id as string) < targetSocketId;

    function handleParticipants(nextParticipants: WorkspaceVoiceParticipant[]) {
      const currentSocketId = activeSocket.id ?? "self";
      const hasLocalVoice = Boolean(localStreamRef.current);

      if (hasLocalVoice) {
        console.debug(
          "[voice] Participant snapshot received.",
          nextParticipants,
        );
        setConnectionStatus(
          nextParticipants.length ? "connecting" : "connected",
        );
      }

      setParticipants((currentParticipants) => {
        const existingSelf = currentParticipants.find(
          (participant) => participant.userId === currentUser.userId,
        );

        const selfParticipant: WorkspaceVoiceParticipant | null = hasLocalVoice
          ? {
              userId: currentUser.userId,
              name: currentUser.name,
              email: currentUser.email,
              image: currentUser.image,
              username: currentUser.username,
              socketId: existingSelf?.socketId ?? currentSocketId,
              role: currentUser.role,
              isSpeaking: existingSelf?.isSpeaking ?? false,
              isMutedByModerator: existingSelf?.isMutedByModerator ?? false,
            }
          : null;

        const mergedOthers = nextParticipants.filter(
          (participant) => participant.userId !== currentUser.userId,
        );

        return selfParticipant
          ? [selfParticipant, ...mergedOthers]
          : mergedOthers;
      });

      if (hasLocalVoice) {
        nextParticipants.forEach((participant) => {
          if (participant.userId === currentUser.userId) {
            return;
          }

          if (!shouldInitiateOffer(participant.socketId)) {
            return;
          }

          void createOfferForParticipant(participant.socketId);
        });
      }
    }

    function handleParticipantJoined(participant: WorkspaceVoiceParticipant) {
      console.debug("[voice] Participant joined voice.", participant);
      setParticipants((currentParticipants) => {
        const remainingParticipants = currentParticipants.filter(
          (currentParticipant) =>
            currentParticipant.socketId !== participant.socketId &&
            currentParticipant.userId !== participant.userId,
        );

        return [...remainingParticipants, participant];
      });

      if (
        localStreamRef.current &&
        participant.userId !== currentUser.userId &&
        shouldInitiateOffer(participant.socketId)
      ) {
        void createOfferForParticipant(participant.socketId);
      }
    }

    function handleParticipantLeft(payload: {
      socketId: string;
      userId: string;
    }) {
      console.debug("[voice] Participant left voice.", payload);
      peerConnectionsRef.current.get(payload.socketId)?.close();
      peerConnectionsRef.current.delete(payload.socketId);
      pendingIceCandidatesRef.current.delete(payload.socketId);
      remoteStreamsRef.current.delete(payload.socketId);
      setParticipants((currentParticipants) =>
        currentParticipants.filter(
          (participant) => participant.socketId !== payload.socketId,
        ),
      );
      setRemoteAudio((currentAudio) =>
        currentAudio.filter(
          (item) => item.participant.socketId !== payload.socketId,
        ),
      );
    }

    async function handleSignal(payload: VoiceSignalPayload) {
      if (payload.sourceUser) {
        setParticipants((currentParticipants) => {
          if (
            currentParticipants.some(
              (participant) => participant.socketId === payload.sourceSocketId,
            )
          ) {
            return currentParticipants;
          }

          return [
            ...currentParticipants,
            payload.sourceUser as WorkspaceVoiceParticipant,
          ];
        });
      }

      const peer = ensurePeerConnection(payload.sourceSocketId);

      if (!peer || !socket) {
        return;
      }

      if (payload.signal.type === "offer") {
        console.debug("[voice] Received offer.", payload.sourceSocketId);
        await peer.setRemoteDescription(
          new RTCSessionDescription(payload.signal.sdp),
        );
        await flushPendingIceCandidates(payload.sourceSocketId);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        console.debug("[voice] Sending answer.", payload.sourceSocketId);
        activeSocket.emit("voice:signal", {
          workspaceId,
          targetSocketId: payload.sourceSocketId,
          signal: {
            type: "answer",
            sdp: answer,
          } satisfies VoiceSignal,
        });
        return;
      }

      if (payload.signal.type === "answer") {
        console.debug("[voice] Received answer.", payload.sourceSocketId);
        await peer.setRemoteDescription(
          new RTCSessionDescription(payload.signal.sdp),
        );
        await flushPendingIceCandidates(payload.sourceSocketId);
        return;
      }

      if (payload.signal.type === "ice-candidate") {
        if (!peer.remoteDescription) {
          const queuedCandidates =
            pendingIceCandidatesRef.current.get(payload.sourceSocketId) ?? [];
          pendingIceCandidatesRef.current.set(payload.sourceSocketId, [
            ...queuedCandidates,
            payload.signal.candidate,
          ]);
          console.debug(
            "[voice] Queued ICE candidate until remote description is ready.",
            payload.sourceSocketId,
          );
          return;
        }

        console.debug(
          "[voice] Applying ICE candidate.",
          payload.sourceSocketId,
        );
        await peer.addIceCandidate(
          new RTCIceCandidate(payload.signal.candidate),
        );
      }
    }

    function handleSpeaking(payload: {
      socketId: string;
      isSpeaking: boolean;
    }) {
      setParticipants((currentParticipants) =>
        currentParticipants.map((participant) =>
          participant.socketId === payload.socketId
            ? { ...participant, isSpeaking: payload.isSpeaking }
            : participant,
        ),
      );
    }

    function handleVoiceError(payload: { message: string }) {
      setVoiceError(payload.message);
      setConnectionStatus("failed");
    }

    function handleModeratedLeave(payload: { reason: string }) {
      setVoiceError(payload.reason);
      leaveVoice();
    }

    function handleSignalEvent(payload: VoiceSignalPayload) {
      void handleSignal(payload);
    }

    activeSocket.on("voice:participants", handleParticipants);
    activeSocket.on("voice:participant-joined", handleParticipantJoined);
    activeSocket.on("voice:participant-left", handleParticipantLeft);
    activeSocket.on("voice:signal", handleSignalEvent);
    activeSocket.on("voice:speaking", handleSpeaking);
    activeSocket.on("voice:error", handleVoiceError);
    activeSocket.on("voice:moderated-leave", handleModeratedLeave);

    return () => {
      activeSocket.off("voice:participants", handleParticipants);
      activeSocket.off("voice:participant-joined", handleParticipantJoined);
      activeSocket.off("voice:participant-left", handleParticipantLeft);
      activeSocket.off("voice:speaking", handleSpeaking);
      activeSocket.off("voice:error", handleVoiceError);
      activeSocket.off("voice:moderated-leave", handleModeratedLeave);
      activeSocket.off("voice:signal", handleSignalEvent);
    };
  }, [
    createOfferForParticipant,
    currentUser.email,
    currentUser.image,
    currentUser.name,
    currentUser.role,
    currentUser.userId,
    currentUser.username,
    ensurePeerConnection,
    flushPendingIceCandidates,
    isVoiceJoined,
    leaveVoice,
    socket,
    workspaceId,
  ]);

  useEffect(() => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !isSelfMuted;
    });
  }, [isSelfMuted]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (audioContextRef.current?.state === "suspended") {
          void audioContextRef.current.resume().catch(() => undefined);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Intentionally omitting cleanupVoice on unmount!
    // We want the WebRTC connection to persist when tabs switch or components remount.
    // The user will explicitly leave voice using the leaveVoice function.
  }, [cleanupVoice]);

  useEffect(() => {
    if (!socket || !isVoiceJoined || !localStreamRef.current) {
      return;
    }

    const handleReconnect = () => {
      setConnectionStatus("connecting");
      socket.emit("voice:join", {
        workspaceId,
      });
    };

    socket.on("connect", handleReconnect);

    return () => {
      socket.off("connect", handleReconnect);
    };
  }, [isVoiceJoined, socket, workspaceId]);

  const retryVoiceConnection = useCallback(async () => {
    if (!socket) {
      setVoiceError("Realtime connection is not ready yet.");
      setConnectionStatus("failed");
      return;
    }

    if (isVoiceJoined) {
      socket.emit("voice:leave", {
        workspaceId,
      });
    }

    cleanupVoice();
    setIsVoiceJoined(false);
    await joinVoice();
  }, [cleanupVoice, isVoiceJoined, joinVoice, socket, workspaceId]);

  return {
    isVoiceJoined,
    isJoiningVoice,
    isSelfMuted,
    isListeningForSound,
    localAudioLevel,
    connectionStatus,
    voiceError,
    participants,
    remoteAudio,
    joinVoice,
    leaveVoice,
    retryVoiceConnection,
    toggleSelfMuted: () => setIsSelfMuted((currentValue) => !currentValue),
    clearVoiceError: () => setVoiceError(null),
  };
}
