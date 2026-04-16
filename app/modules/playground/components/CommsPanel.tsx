"use client";

import type {
  WorkspaceChatMessage,
  WorkspaceCurrentUser,
} from "@/app/modules/workspaces/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommsCard } from "./CommsCard";

type CommsPanelProps = {
  currentUser: WorkspaceCurrentUser;
  chatMessages: WorkspaceChatMessage[];
  chatDraft: string;
  isSendingChat: boolean;
  onChatDraftChange: (value: string) => void;
  onSendChat: () => void;
};

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
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
        {chatMessages.length ? (
          <div className="w-full max-w-full overflow-x-auto scroll-smooth pb-3">
            <div className="flex min-w-max flex-nowrap gap-3 whitespace-nowrap">
              {chatMessages.map((message) => (
                <CommsCard
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            No messages yet
          </div>
        )}
      </div>

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
