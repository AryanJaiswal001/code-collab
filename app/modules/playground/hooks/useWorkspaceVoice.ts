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

  peer.onicecandidate = (event) => {
    if (!event.candidate) {
      return;
    }

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

    if (stream) {
      params.onRemoteStream(params.targetSocketId, stream);
    }
  };

  return peer;
}

export function useWorkspaceVoice({
  workspaceId,
  currentUser,
  socket,
}: UseWorkspaceVoiceParams) {
  const [isVoiceJoined, setIsVoiceJoined] = useState(false);
  const [isJoiningVoice, setIsJoiningVoice] = useState(false);
  const [isSelfMuted, setIsSelfMuted] = useState(false);
  const [isListeningForSound, setIsListeningForSound] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<WorkspaceVoiceParticipant[]>([]);
  const [remoteAudio, setRemoteAudio] = useState<RemoteAudioState[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const speakingFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastSpeakingStateRef = useRef(false);
  const participantsRef = useRef<WorkspaceVoiceParticipant[]>([]);
  const isSelfMutedRef = useRef(false);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    isSelfMutedRef.current = isSelfMuted;
  }, [isSelfMuted]);

  const updateRemoteStream = useCallback((socketId: string, stream: MediaStream) => {
    setRemoteAudio((currentAudio) => {
      const nextAudio = currentAudio.filter((item) => item.participant.socketId !== socketId);
      const participant = participantsRef.current.find((item) => item.socketId === socketId);

      if (!participant) {
        return currentAudio;
      }

      return [...nextAudio, { participant, stream }];
    });
  }, []);

  const cleanupVoice = useCallback(() => {
    if (speakingFrameRef.current) {
      window.cancelAnimationFrame(speakingFrameRef.current);
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
    setRemoteAudio([]);

    for (const track of localStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    localStreamRef.current = null;
  }, []);

  const ensurePeerConnection = useCallback((targetSocketId: string) => {
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
    });

    peerConnectionsRef.current.set(targetSocketId, peer);
    return peer;
  }, [socket, updateRemoteStream, workspaceId]);

  const createOfferForParticipant = useCallback(async (targetSocketId: string) => {
    const peer = ensurePeerConnection(targetSocketId);

    if (!peer || !socket) {
      return;
    }

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("voice:signal", {
      workspaceId,
      targetSocketId,
      signal: {
        type: "offer",
        sdp: offer,
      } satisfies VoiceSignal,
    });
  }, [ensurePeerConnection, socket, workspaceId]);

  const startSpeakingDetector = useCallback(() => {
    if (!localStreamRef.current || !socket) {
      return;
    }

    if (speakingFrameRef.current) {
      window.cancelAnimationFrame(speakingFrameRef.current);
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
        buffer.reduce((total, value) => total + Math.abs(value - 128), 0) / buffer.length;
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

      speakingFrameRef.current = window.requestAnimationFrame(tick);
    };

    speakingFrameRef.current = window.requestAnimationFrame(tick);
  }, [currentUser.userId, socket, workspaceId]);

  const joinVoice = useCallback(async () => {
    if (!socket || isVoiceJoined || isJoiningVoice) {
      return;
    }

    setIsJoiningVoice(true);
    setVoiceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isSelfMutedRef.current;
      });

      socket.emit("voice:join", {
        workspaceId,
      });

      startSpeakingDetector();
      setIsVoiceJoined(true);
    } catch (error) {
      setVoiceError(
        error instanceof Error ? error.message : "Unable to access your microphone.",
      );
      cleanupVoice();
    } finally {
      setIsJoiningVoice(false);
    }
  }, [cleanupVoice, isJoiningVoice, isVoiceJoined, socket, startSpeakingDetector, workspaceId]);

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
      currentParticipants.filter((participant) => participant.userId !== currentUser.userId),
    );
  }, [cleanupVoice, currentUser.userId, socket, workspaceId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const activeSocket = socket;

    function handleParticipants(nextParticipants: WorkspaceVoiceParticipant[]) {
      const currentSocketId = activeSocket.id ?? "self";

      setParticipants((currentParticipants) => {
        const existingSelf = currentParticipants.find(
          (participant) => participant.userId === currentUser.userId,
        );

        const selfParticipant: WorkspaceVoiceParticipant | null = isVoiceJoined
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

        return selfParticipant ? [selfParticipant, ...mergedOthers] : mergedOthers;
      });

      if (isVoiceJoined) {
        nextParticipants.forEach((participant) => {
          if (participant.userId === currentUser.userId) {
            return;
          }

          void createOfferForParticipant(participant.socketId);
        });
      }
    }

    function handleParticipantJoined(participant: WorkspaceVoiceParticipant) {
      setParticipants((currentParticipants) => {
        const remainingParticipants = currentParticipants.filter(
          (currentParticipant) =>
            currentParticipant.socketId !== participant.socketId &&
            currentParticipant.userId !== participant.userId,
        );

        return [...remainingParticipants, participant];
      });
    }

    function handleParticipantLeft(payload: { socketId: string; userId: string }) {
      peerConnectionsRef.current.get(payload.socketId)?.close();
      peerConnectionsRef.current.delete(payload.socketId);
      setParticipants((currentParticipants) =>
        currentParticipants.filter((participant) => participant.socketId !== payload.socketId),
      );
      setRemoteAudio((currentAudio) =>
        currentAudio.filter((item) => item.participant.socketId !== payload.socketId),
      );
    }

    async function handleSignal(payload: {
      sourceSocketId: string;
      signal: VoiceSignal;
    }) {
      const peer = ensurePeerConnection(payload.sourceSocketId);

      if (!peer || !socket) {
        return;
      }

      if (payload.signal.type === "offer") {
        await peer.setRemoteDescription(new RTCSessionDescription(payload.signal.sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
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
        await peer.setRemoteDescription(new RTCSessionDescription(payload.signal.sdp));
        return;
      }

      if (payload.signal.type === "ice-candidate") {
        await peer.addIceCandidate(new RTCIceCandidate(payload.signal.candidate));
      }
    }

    function handleSpeaking(payload: { socketId: string; isSpeaking: boolean }) {
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
    }

    function handleModeratedLeave(payload: { reason: string }) {
      setVoiceError(payload.reason);
      leaveVoice();
    }

    function handleSignalEvent(payload: { sourceSocketId: string; signal: VoiceSignal }) {
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
    return () => {
      cleanupVoice();
    };
  }, [cleanupVoice]);

  useEffect(() => {
    if (!socket || !isVoiceJoined || !localStreamRef.current) {
      return;
    }

    const handleReconnect = () => {
      socket.emit("voice:join", {
        workspaceId,
      });
    };

    socket.on("connect", handleReconnect);

    return () => {
      socket.off("connect", handleReconnect);
    };
  }, [isVoiceJoined, socket, workspaceId]);

  return {
    isVoiceJoined,
    isJoiningVoice,
    isSelfMuted,
    isListeningForSound,
    localAudioLevel,
    voiceError,
    participants,
    remoteAudio,
    joinVoice,
    leaveVoice,
    toggleSelfMuted: () => setIsSelfMuted((currentValue) => !currentValue),
    clearVoiceError: () => setVoiceError(null),
  };
}
