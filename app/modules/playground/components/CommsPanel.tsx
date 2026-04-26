"use client";

import { useEffect, useRef } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black/20">
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 space-y-4">
        {chatMessages.length > 0 ? (
          chatMessages.map((message) => (
            <CommsCard
              key={message.id}
              message={message}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            No messages yet
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 p-4">
        <Textarea
          value={chatDraft}
          onChange={(event) => onChatDraftChange(event.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (chatDraft.trim() && !isSendingChat) {
                onSendChat();
              }
            }
          }}
          placeholder="Share context, ask for a push, or leave feedback..."
          className="min-h-[80px] w-full resize-none rounded-xl border-white/10 bg-white/[0.03] p-3 text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-white/20"
        />
        <Button
          type="button"
          className="mt-3 w-full rounded-lg border border-blue-500/40 bg-blue-600 text-white transition-colors hover:bg-blue-500"
          disabled={isSendingChat || !chatDraft.trim()}
          onClick={onSendChat}
        >
          {isSendingChat ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </div>
  );
}
