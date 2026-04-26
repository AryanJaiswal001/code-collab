"use client";

import { formatDistanceToNow } from "date-fns";
import type {
  WorkspaceChatMessage,
  WorkspaceCurrentUser,
} from "@/app/modules/workspaces/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type CommsCardProps = {
  message: WorkspaceChatMessage;
  currentUser: WorkspaceCurrentUser;
};

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export function CommsCard({ message, currentUser }: CommsCardProps) {
  const isSelf = message.author.userId === currentUser.userId;
  const authorName = isSelf ? "You" : message.author.name;

  return (
    <article
      className={cn("flex w-full", isSelf ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex max-w-[70%] flex-col gap-2 rounded-2xl p-4 text-sm",
          isSelf
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm border border-white/10 bg-white/[0.04] text-white",
        )}
      >
        {!isSelf && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 flex-shrink-0 border border-white/10">
              <AvatarImage
                src={message.author.image ?? undefined}
                alt={authorName}
              />
              <AvatarFallback className="text-[10px]">
                {getInitials(authorName) || "?"}
              </AvatarFallback>
            </Avatar>
            <p
              className="truncate text-xs font-semibold text-white/90"
              title={authorName}
            >
              {authorName}
            </p>
          </div>
        )}

        <p
          className="whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]"
          title={message.content}
        >
          {message.content}
        </p>

        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isSelf ? "text-blue-200" : "text-white/40",
          )}
        >
          {formatDistanceToNow(new Date(message.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </article>
  );
}
