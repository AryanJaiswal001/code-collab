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
      className={cn(
        "min-w-[260px] max-w-[320px] flex-shrink-0 rounded-lg border p-4 text-sm",
        isSelf
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
          : "border-white/10 bg-white/[0.04] text-white",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0 border border-white/10">
          <AvatarImage
            src={message.author.image ?? undefined}
            alt={authorName}
          />
          <AvatarFallback>{getInitials(authorName) || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white" title={authorName}>
            {authorName}
          </p>
          <p className="truncate text-[11px] text-white/45">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>

      <p
        className="mt-3 max-h-40 overflow-hidden whitespace-pre-wrap break-words leading-6 text-white/85 [overflow-wrap:anywhere]"
        title={message.content}
      >
        {message.content}
      </p>
    </article>
  );
}

