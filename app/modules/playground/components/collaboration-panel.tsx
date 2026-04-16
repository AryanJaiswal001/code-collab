"use client";

import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  BadgeCheck,
  Copy,
  Loader2,
  LogOut,
  MailPlus,
  MessageSquare,
  Mic,
  MicOff,
  GitPullRequest,
  Radio,
  Shield,
  UserMinus,
  Users,
  Volume2,
} from "lucide-react";
import type {
  WorkspaceActivity,
  WorkspaceChatMessage,
  WorkspaceCurrentUser,
  WorkspaceMember,
  WorkspacePresence,
  WorkspaceVoiceParticipant,
} from "@/app/modules/workspaces/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MergeRequestPanel } from "./merge-request-panel";
import type { WorkspaceMergeRequestChange } from "./merge-request-panel";

type RemoteAudioState = {
  participant: WorkspaceVoiceParticipant;
  stream: MediaStream | null;
};

type CollaborationPanelProps = {
  workspaceId: string;
  activeTab: "chat" | "members" | "voice" | "activity" | "merge-requests";
  unreadChatCount: number;
  unreadActivityCount: number;
  unreadMergeRequestsCount?: number;
  pendingMergeRequestsCount?: number;
  mergeRequestRefreshKey?: number;
  mergeRequestFileChanges?: WorkspaceMergeRequestChange[];
  currentUser: WorkspaceCurrentUser;
  members: WorkspaceMember[];
  presence: WorkspacePresence[];
  chatMessages: WorkspaceChatMessage[];
  chatDraft: string;
  isSendingChat: boolean;
  activities: WorkspaceActivity[];
  voiceParticipants: WorkspaceVoiceParticipant[];
  remoteAudio: RemoteAudioState[];
  isVoiceJoined: boolean;
  isJoiningVoice: boolean;
  isSelfMuted: boolean;
  isListeningForSound: boolean;
  localAudioLevel: number;
  voiceError: string | null;
  inviteEmailDraft: string;
  latestInviteUrl: string | null;
  isSendingInvites: boolean;
  memberActionInFlightId: string | null;
  onTabChange: (
    tab: "chat" | "members" | "voice" | "activity" | "merge-requests",
  ) => void;
  onChatDraftChange: (value: string) => void;
  onSendChat: () => void;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleSelfMuted: () => void;
  onClearVoiceError: () => void;
  onInviteEmailDraftChange: (value: string) => void;
  onCreateInviteLink: () => void;
  onSendEmailInvites: () => void;
  onPromoteMember: (memberId: string) => void;
  onDemoteMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onToggleVoiceMute: (memberId: string, isVoiceMuted: boolean) => void;
  onPendingMergeRequestsCountChange?: (count: number) => void;
  onMergeRequestCreated?: () => void;
  className?: string;
};

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

function AudioPlayer({ stream }: { stream: MediaStream | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.srcObject = stream;
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}

export function CollaborationPanel({
  workspaceId,
  activeTab,
  unreadChatCount,
  unreadActivityCount,
  unreadMergeRequestsCount,
  pendingMergeRequestsCount,
  mergeRequestRefreshKey,
  mergeRequestFileChanges = [],
  currentUser,
  members,
  presence,
  chatMessages,
  chatDraft,
  isSendingChat,
  activities,
  voiceParticipants,
  remoteAudio,
  isVoiceJoined,
  isJoiningVoice,
  isSelfMuted,
  isListeningForSound,
  localAudioLevel,
  voiceError,
  inviteEmailDraft,
  latestInviteUrl,
  isSendingInvites,
  memberActionInFlightId,
  onTabChange,
  onChatDraftChange,
  onSendChat,
  onJoinVoice,
  onLeaveVoice,
  onToggleSelfMuted,
  onClearVoiceError,
  onInviteEmailDraftChange,
  onCreateInviteLink,
  onSendEmailInvites,
  onPromoteMember,
  onDemoteMember,
  onRemoveMember,
  onToggleVoiceMute,
  onPendingMergeRequestsCountChange,
  onMergeRequestCreated,
  className,
}: CollaborationPanelProps) {
  const presenceByUserId = new Map(presence.map((item) => [item.userId, item]));
  const primaryButtonClass =
    "rounded-xl border border-blue-500/40 bg-blue-600 text-white shadow-[0_12px_32px_rgba(37,99,235,0.22)] hover:bg-blue-500";
  const secondaryButtonClass =
    "rounded-xl border border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10";

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-l border-white/10 bg-[#060b16]",
        className,
      )}
    >
      <div className="flex-shrink-0 border-b border-white/10 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
          Collaboration
        </p>
        <div className="mt-3 flex items-center gap-2">
          {members.slice(0, 5).map((member) => {
            const online = presenceByUserId.has(member.userId);

            return (
              <div key={member.userId} className="relative">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage
                    src={member.image ?? undefined}
                    alt={member.name}
                  />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[#060b16]",
                    online ? "bg-emerald-400" : "bg-slate-500",
                  )}
                />
              </div>
            );
          })}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">
              {presence.length} online collaborator
              {presence.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-white/45">
              {voiceParticipants.length} in voice right now
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          onTabChange(
            value as
              | "chat"
              | "members"
              | "voice"
              | "activity"
              | "merge-requests",
          )
        }
        className="min-h-0 flex-1"
      >
        <div className="border-b border-white/10 px-3 py-3">
          <TabsList className="grid w-full grid-cols-5 gap-1 rounded-xl bg-white/5 p-1">
            <TabsTrigger
              value="chat"
              className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
              {unreadChatCount ? (
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 py-0 text-[10px]"
                >
                  {unreadChatCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs"
            >
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs"
            >
              <Radio className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs"
            >
              <Activity className="h-4 w-4" />
              Activity
              {unreadActivityCount ? (
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 py-0 text-[10px]"
                >
                  {unreadActivityCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="merge-requests"
              className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs"
            >
              <GitPullRequest className="h-4 w-4" />
              <span className="truncate">Merge Requests</span>
              {pendingMergeRequestsCount || unreadMergeRequestsCount ? (
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 py-0 text-[10px]"
                >
                  {pendingMergeRequestsCount || unreadMergeRequestsCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent
          value="chat"
          className="mt-0 flex h-full flex-col data-[state=inactive]:hidden"
        >
          <ScrollArea className="ide-scrollbar min-h-0 flex-1 px-4 py-4">
            <div className="space-y-3">
              {chatMessages.length ? (
                chatMessages.map((message) => {
                  const isSelf = message.author.userId === currentUser.userId;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        isSelf ? "justify-end" : "justify-start",
                      )}
                    >
                      {!isSelf ? (
                        <Avatar className="mt-0.5 h-8 w-8 border border-white/10">
                          <AvatarImage
                            src={message.author.image ?? undefined}
                            alt={message.author.name}
                          />
                          <AvatarFallback>
                            {getInitials(message.author.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl border px-3 py-2 text-sm",
                          isSelf
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
                            : "border-white/10 bg-white/[0.04] text-white",
                        )}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-white/55">
                          <span>{isSelf ? "You" : message.author.name}</span>
                          <span>
                            {formatDistanceToNow(new Date(message.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap leading-6">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                  Start the conversation for this workspace.
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-white/10 p-4">
            <Textarea
              value={chatDraft}
              onChange={(event) => onChatDraftChange(event.target.value)}
              placeholder="Share context, ask for a push, or leave feedback..."
              className="min-h-24 rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
            />
            <Button
              type="button"
              className="mt-3 w-full rounded-xl border border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500"
              disabled={isSendingChat || !chatDraft.trim()}
              onClick={onSendChat}
            >
              {isSendingChat ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent
          value="members"
          className="mt-0 flex h-full flex-col data-[state=inactive]:hidden"
        >
          <ScrollArea className="ide-scrollbar min-h-0 flex-1 px-4 py-4">
            <div className="space-y-4">
              {members.map((member) => {
                const online = presenceByUserId.get(member.userId);
                const canPromote =
                  currentUser.role === "OWNER" &&
                  member.role === "MEMBER" &&
                  member.userId !== currentUser.userId;
                const canDemote =
                  currentUser.role === "OWNER" &&
                  member.role === "ADMIN" &&
                  member.userId !== currentUser.userId;
                const canRemove =
                  member.userId !== currentUser.userId &&
                  currentUser.canManageMembers &&
                  (currentUser.role === "OWNER" || member.role === "MEMBER");
                const canMuteVoice =
                  member.userId !== currentUser.userId &&
                  currentUser.canModerateVoice &&
                  (currentUser.role === "OWNER" || member.role === "MEMBER");

                return (
                  <div
                    key={member.userId}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-white/10">
                          <AvatarImage
                            src={member.image ?? undefined}
                            alt={member.name}
                          />
                          <AvatarFallback>
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[#060b16]",
                            online ? "bg-emerald-400" : "bg-slate-500",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {member.name}
                          </p>
                          <Badge
                            variant="outline"
                            className="border-white/10 bg-white/5 text-white/75"
                          >
                            {member.role}
                          </Badge>
                          {member.isVoiceMuted ? (
                            <Badge
                              variant="outline"
                              className="border-red-400/20 bg-red-400/10 text-red-200"
                            >
                              Voice muted
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-white/45">
                          {member.email ?? "No email"}
                        </p>
                        <p className="mt-2 text-xs text-white/55">
                          {online?.activeFilePath
                            ? `Active in ${online.activeFilePath}`
                            : online
                              ? "Online in workspace"
                              : "Offline"}
                        </p>
                      </div>
                    </div>

                    {canPromote || canDemote || canRemove || canMuteVoice ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canPromote ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={secondaryButtonClass}
                            onClick={() => onPromoteMember(member.userId)}
                            disabled={memberActionInFlightId === member.userId}
                          >
                            <Shield className="mr-1.5 h-4 w-4" />
                            Make admin
                          </Button>
                        ) : null}
                        {canDemote ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={secondaryButtonClass}
                            onClick={() => onDemoteMember(member.userId)}
                            disabled={memberActionInFlightId === member.userId}
                          >
                            <BadgeCheck className="mr-1.5 h-4 w-4" />
                            Revoke admin
                          </Button>
                        ) : null}
                        {canMuteVoice ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={secondaryButtonClass}
                            onClick={() =>
                              onToggleVoiceMute(
                                member.userId,
                                !member.isVoiceMuted,
                              )
                            }
                            disabled={memberActionInFlightId === member.userId}
                          >
                            {member.isVoiceMuted ? (
                              <Mic className="mr-1.5 h-4 w-4" />
                            ) : (
                              <MicOff className="mr-1.5 h-4 w-4" />
                            )}
                            {member.isVoiceMuted
                              ? "Restore voice"
                              : "Mute voice"}
                          </Button>
                        ) : null}
                        {canRemove ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full border-red-400/20 bg-red-400/10 text-red-100 hover:border-red-400/30 hover:bg-red-400/15"
                            onClick={() => onRemoveMember(member.userId)}
                            disabled={memberActionInFlightId === member.userId}
                          >
                            <UserMinus className="mr-1.5 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {currentUser.canManageInvites ? (
            <div className="border-t border-white/10 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                Invite Access
              </p>
              <div className="mt-3 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full", secondaryButtonClass)}
                  onClick={onCreateInviteLink}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Generate Link
                </Button>
                {latestInviteUrl ? (
                  <div className="flex items-center justify-between gap-2 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
                    <div className="flex-1 min-w-0 px-2 text-xs text-white/60">
                      <p className="truncate" title={latestInviteUrl}>
                        {latestInviteUrl}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 px-2.5 text-xs text-white hover:bg-white/10"
                      onClick={() =>
                        navigator.clipboard.writeText(latestInviteUrl)
                      }
                    >
                      Copy
                    </Button>
                  </div>
                ) : null}

                <Input
                  value={inviteEmailDraft}
                  onChange={(event) =>
                    onInviteEmailDraftChange(event.target.value)
                  }
                  placeholder="teammate@company.com, reviewer@company.com"
                  className="rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
                />
                <Button
                  type="button"
                  className={cn("w-full", primaryButtonClass)}
                  disabled={isSendingInvites || !inviteEmailDraft.trim()}
                  onClick={onSendEmailInvites}
                >
                  <MailPlus className="mr-2 h-4 w-4" />
                  {isSendingInvites ? "Sending..." : "Send Email Invites"}
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent
          value="voice"
          className="mt-0 flex h-full flex-col data-[state=inactive]:hidden bg-[#0F111A]"
        >
          {isVoiceJoined ? (
            <>
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#171A21] px-4 py-3">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      Voice Channel
                    </h2>
                    <p className="text-xs font-medium text-emerald-400">
                      {voiceParticipants.length} connected
                    </p>
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    onClick={onToggleSelfMuted}
                  >
                    {isSelfMuted ? (
                      <MicOff className="h-4 w-4 text-red-400 mr-1.5" />
                    ) : (
                      <Mic className="h-4 w-4 text-emerald-400 mr-1.5" />
                    )}
                    {isSelfMuted ? "Unmute" : "Mute"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    onClick={onLeaveVoice}
                  >
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Disconnect
                  </Button>
                </div>
              </div>

              {voiceError ? (
                <div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex-1 truncate">{voiceError}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-red-300 hover:bg-red-500/20 hover:text-white"
                      onClick={onClearVoiceError}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : null}

              <ScrollArea className="ide-scrollbar min-h-0 flex-1 px-4 py-4">
                <div className="grid grid-cols-1 gap-2">
                  {voiceParticipants.length ? (
                    voiceParticipants.map((participant) => {
                      const isCurrentUser =
                        participant.userId === currentUser.userId;
                      const isMuted = isCurrentUser
                        ? isSelfMuted
                        : participant.isMutedByModerator;
                      const isActiveSpeaker = isCurrentUser
                        ? !isSelfMuted &&
                          isListeningForSound &&
                          localAudioLevel > 0.05
                        : participant.isSpeaking;

                      return (
                        <div
                          key={participant.socketId}
                          className={cn(
                            "group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-all duration-200",
                            isActiveSpeaker
                              ? "bg-emerald-500/10 border-emerald-500/20"
                              : "hover:bg-white/5 border-transparent",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="relative">
                              <Avatar
                                className={cn(
                                  "h-9 w-9 ring-2 transition-all duration-200",
                                  isActiveSpeaker
                                    ? "ring-emerald-500 ring-offset-2 ring-offset-[#0F111A]"
                                    : "ring-transparent",
                                  isMuted && "opacity-60",
                                )}
                              >
                                <AvatarImage
                                  src={participant.image ?? undefined}
                                  alt={participant.name}
                                />
                                <AvatarFallback className="bg-[#2B2D31] text-white">
                                  {getInitials(participant.name)}
                                </AvatarFallback>
                              </Avatar>
                              {isMuted && (
                                <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#0F111A] bg-zinc-800">
                                  <MicOff className="h-2.5 w-2.5 text-red-500" />
                                </div>
                              )}
                              {isActiveSpeaker && !isMuted && (
                                <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#0F111A] bg-emerald-500">
                                  <div className="h-2 w-2 rounded-full animate-ping bg-white" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "truncate text-[13px] font-semibold",
                                    isActiveSpeaker
                                      ? "text-white"
                                      : "text-zinc-300",
                                  )}
                                >
                                  {participant.name}
                                </span>
                                {isCurrentUser && (
                                  <span className="shrink-0 rounded bg-white/10 px-1 text-[9px] font-bold uppercase text-zinc-400">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="truncate text-[11px] font-medium text-zinc-500">
                                {isActiveSpeaker
                                  ? "Speaking..."
                                  : isMuted
                                    ? "Muted"
                                    : "Idle"}
                              </span>
                            </div>
                          </div>

                          {isActiveSpeaker && (
                            <div className="flex shrink-0 items-end justify-center gap-0.5 h-4 mb-1">
                              {[0, 1, 2].map((i) => {
                                // For current user, we can use localAudioLevel to drive it somewhat
                                // For remote users, we just use a CSS animation
                                const barHeight = isCurrentUser
                                  ? `${Math.max(20, Math.min(100, localAudioLevel * 200 + i * 10))}%`
                                  : "100%";

                                return (
                                  <div
                                    key={i}
                                    className="w-1 bg-emerald-400 rounded-t-sm animate-pulse"
                                    style={{
                                      height: barHeight,
                                      animationDuration: `${0.4 + i * 0.15}s`,
                                      animationDelay: `${i * 0.1}s`,
                                      animationDirection: "alternate",
                                      animationIterationCount: "infinite",
                                    }}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                      </div>
                      <p className="text-sm font-medium text-zinc-400">
                        Connecting to Voice...
                      </p>
                    </div>
                  )}
                </div>
                {remoteAudio.map((item) => (
                  <AudioPlayer
                    key={item.participant.socketId}
                    stream={item.stream}
                  />
                ))}
              </ScrollArea>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-xl border border-white/5 bg-[#171A21] p-6 shadow-xl">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Mic className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
                <h3 className="text-center text-lg font-bold text-white">
                  Join Workspace Voice
                </h3>
                <p className="mt-2 text-center text-sm text-zinc-400">
                  Jump in to hear your teammates and collaborate in real-time.
                  (Discord-style huddle)
                </p>
                {voiceError ? (
                  <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {voiceError}
                  </div>
                ) : null}
                <Button
                  type="button"
                  className="mt-6 w-full rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 h-10 transition-colors"
                  disabled={isJoiningVoice}
                  onClick={onJoinVoice}
                >
                  {isJoiningVoice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Join Voice"
                  )}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="activity"
          className="mt-0 flex h-full flex-col data-[state=inactive]:hidden"
        >
          <ScrollArea className="ide-scrollbar min-h-0 flex-1 px-4 py-4">
            <div className="space-y-3">
              {activities.length ? (
                activities.map((activityItem) => (
                  <div
                    key={activityItem.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                      <span>{activityItem.actor?.name ?? "Workspace"}</span>
                      <span>
                        {formatDistanceToNow(new Date(activityItem.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-white">
                      {activityItem.message}
                    </p>
                    {activityItem.filePath ? (
                      <p className="mt-2 text-xs text-emerald-200/75">
                        {activityItem.filePath}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                  Activity will appear here as collaborators join, push files,
                  and sync changes.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent
          value="merge-requests"
          className="mt-0 flex h-full flex-col data-[state=inactive]:hidden"
        >
          <MergeRequestPanel
            workspaceId={workspaceId}
            isActive={activeTab === "merge-requests"}
            refreshKey={mergeRequestRefreshKey}
            fileChanges={mergeRequestFileChanges}
            onPendingCountChange={onPendingMergeRequestsCountChange}
            onMergeRequestCreated={onMergeRequestCreated}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
