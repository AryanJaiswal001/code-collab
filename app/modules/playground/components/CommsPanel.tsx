"use client";

import { formatDistanceToNow } from "date-fns";
import type {
  WorkspaceChatMessage,
  WorkspaceCurrentUser,
} from "@/app/modules/workspaces/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CommsPanelProps = {
  currentUser: WorkspaceCurrentUser;
  chatMessages: WorkspaceChatMessage[];
  chatDraft: string;
  isSendingChat: boolean;
  onChatDraftChange: (value: string) => void;
  onSendChat: () => void;
};

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export function CommsPanel({
  currentUser,
  chatMessages,
  chatDraft,
  isSendingChat,
  onChatDraftChange,
  onSendChat,
}: CommsPanelProps) {
  return (
    <>
      <ScrollArea className="ide-scrollbar min-h-0 flex-1 px-4 py-4">
        {chatMessages.length ? (
          <div className="space-y-3">
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 whitespace-nowrap">
                {chatMessages.map((message) => {
                  const isSelf = message.author.userId === currentUser.userId;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "min-w-[250px] max-w-[320px] rounded-lg border p-3 text-sm whitespace-normal",
                        isSelf
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
                          : "border-white/10 bg-white/[0.04] text-white",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border border-white/10">
                          <AvatarImage
                            src={message.author.image ?? undefined}
                            alt={message.author.name}
                          />
                          <AvatarFallback>
                            {getInitials(message.author.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-white">
                            {isSelf ? "You" : message.author.name}
                          </p>
                          <p className="truncate text-[11px] text-white/45">
                            {formatDistanceToNow(
                              new Date(message.createdAt),
                              {
                                addSuffix: true,
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap leading-6">
                        {message.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            Start the conversation for this workspace.
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-white/10 p-4">
        <Textarea
          value={chatDraft}
          onChange={(event) => onChatDraftChange(event.target.value)}
          placeholder="Share context, ask for a push, or leave feedback..."
          className="min-h-24 rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-white/35"
        />
        <Button
          type="button"
          className="mt-3 w-full rounded-lg border border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500"
          disabled={isSendingChat || !chatDraft.trim()}
          onClick={onSendChat}
        >
          {isSendingChat ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </>
  );
}

