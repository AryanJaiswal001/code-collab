"use client";

import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  BadgeCheck,
  Copy,
  MailPlus,
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  Shield,
  UserMinus,
  Users,
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

type RemoteAudioState = {
  participant: WorkspaceVoiceParticipant;
  stream: MediaStream | null;
};

type CollaborationPanelProps = {
  activeTab: "chat" | "members" | "voice" | "activity";
  unreadChatCount: number;
  unreadActivityCount: number;
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
  voiceError: string | null;
  inviteEmailDraft: string;
  latestInviteUrl: string | null;
  isSendingInvites: boolean;
  memberActionInFlightId: string | null;
  onTabChange: (tab: "chat" | "members" | "voice" | "activity") => void;
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
  activeTab,
  unreadChatCount,
  unreadActivityCount,
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
                  <AvatarImage src={member.image ?? undefined} alt={member.name} />
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
              {presence.length} online collaborator{presence.length === 1 ? "" : "s"}
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
          onTabChange(value as "chat" | "members" | "voice" | "activity")
        }
        className="min-h-0 flex-1"
      >
        <div className="border-b border-white/10 px-3 py-3">
          <TabsList className="grid w-full grid-cols-4 gap-1 rounded-xl bg-white/5 p-1">
            <TabsTrigger value="chat" className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs">
              <MessageSquare className="h-4 w-4" />
              Chat
              {unreadChatCount ? (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  {unreadChatCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="members" className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="voice" className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs">
              <Radio className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="activity" className="min-w-0 gap-1 px-2 text-[11px] sm:text-xs">
              <Activity className="h-4 w-4" />
              Activity
              {unreadActivityCount ? (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  {unreadActivityCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat" className="mt-0 flex h-full flex-col data-[state=inactive]:hidden">
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
                          <AvatarImage src={message.author.image ?? undefined} alt={message.author.name} />
                          <AvatarFallback>{getInitials(message.author.name)}</AvatarFallback>
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
                        <p className="mt-1 whitespace-pre-wrap leading-6">{message.content}</p>
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

        <TabsContent value="members" className="mt-0 flex h-full flex-col data-[state=inactive]:hidden">
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
                          <AvatarImage src={member.image ?? undefined} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
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
                          <p className="truncate text-sm font-medium text-white">{member.name}</p>
                          <Badge variant="outline" className="border-white/10 bg-white/5 text-white/75">
                            {member.role}
                          </Badge>
                          {member.isVoiceMuted ? (
                            <Badge variant="outline" className="border-red-400/20 bg-red-400/10 text-red-200">
                              Voice muted
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-white/45">{member.email ?? "No email"}</p>
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
                            onClick={() => onToggleVoiceMute(member.userId, !member.isVoiceMuted)}
                            disabled={memberActionInFlightId === member.userId}
                          >
                            {member.isVoiceMuted ? (
                              <Mic className="mr-1.5 h-4 w-4" />
                            ) : (
                              <MicOff className="mr-1.5 h-4 w-4" />
                            )}
                            {member.isVoiceMuted ? "Restore voice" : "Mute voice"}
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("flex-1", secondaryButtonClass)}
                    onClick={onCreateInviteLink}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Generate Link
                  </Button>
                  {latestInviteUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={secondaryButtonClass}
                      onClick={() => navigator.clipboard.writeText(latestInviteUrl)}
                    >
                      Copy
                    </Button>
                  ) : null}
                </div>
                {latestInviteUrl ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60">
                    {latestInviteUrl}
                  </p>
                ) : null}

                <Input
                  value={inviteEmailDraft}
                  onChange={(event) => onInviteEmailDraftChange(event.target.value)}
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

        <TabsContent value="voice" className="mt-0 flex h-full flex-col data-[state=inactive]:hidden">
          <div className="flex-shrink-0 border-b border-white/10 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {isVoiceJoined ? (
                <>
                  <Button
                    type="button"
                    className={primaryButtonClass}
                    onClick={onLeaveVoice}
                  >
                    Leave Voice
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={secondaryButtonClass}
                    onClick={onToggleSelfMuted}
                  >
                    {isSelfMuted ? (
                      <MicOff className="mr-2 h-4 w-4" />
                    ) : (
                      <Mic className="mr-2 h-4 w-4" />
                    )}
                    {isSelfMuted ? "Unmute Mic" : "Mute Mic"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className={primaryButtonClass}
                  disabled={isJoiningVoice}
                  onClick={onJoinVoice}
                >
                  {isJoiningVoice ? "Joining..." : "Join Voice"}
                </Button>
              )}
            </div>
            {voiceError ? (
              <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                <div className="flex items-center justify-between gap-3">
                  <span>{voiceError}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-100 hover:bg-red-400/10 hover:text-white"
                    onClick={onClearVoiceError}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <ScrollArea className="ide-scrollbar min-h-0 flex-1 px-4 py-4">
            <div className="space-y-3">
              {voiceParticipants.length ? (
                voiceParticipants.map((participant) => (
                  <div
                    key={participant.socketId}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={participant.image ?? undefined} alt={participant.name} />
                      <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{participant.name}</p>
                        {participant.isMutedByModerator ? (
                          <Badge variant="outline" className="border-red-400/20 bg-red-400/10 text-red-200">
                            Voice muted
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-white/45">{participant.role}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex h-3 w-3 rounded-full",
                        participant.isSpeaking ? "bg-emerald-400" : "bg-slate-500",
                      )}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                  No one is in voice yet.
                </div>
              )}
            </div>
            {remoteAudio.map((item) => (
              <AudioPlayer key={item.participant.socketId} stream={item.stream} />
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 flex h-full flex-col data-[state=inactive]:hidden">
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
                    <p className="mt-1 text-sm leading-6 text-white">{activityItem.message}</p>
                    {activityItem.filePath ? (
                      <p className="mt-2 text-xs text-emerald-200/75">{activityItem.filePath}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                  Activity will appear here as collaborators join, push files, and sync changes.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
