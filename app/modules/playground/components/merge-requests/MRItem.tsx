"use client";

import { formatDistanceToNow } from "date-fns";
import { GitPullRequest } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MRStatusBadge } from "./MRStatusBadge";
import type { MergeRequest } from "./types";

type MRItemProps = {
  mergeRequest: MergeRequest;
  isSelected: boolean;
  onSelect: (mergeRequest: MergeRequest) => void;
};

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export function MRItem({ mergeRequest, isSelected, onSelect }: MRItemProps) {
  const changedFilesCount = mergeRequest.changes.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(mergeRequest)}
      className={cn(
        "w-full min-w-0 rounded-lg border p-3 text-left transition duration-150",
        "hover:border-white/20 hover:bg-white/[0.07]",
        isSelected
          ? "border-sky-400/35 bg-sky-400/10"
          : "border-white/10 bg-white/[0.035]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <GitPullRequest className="h-4 w-4 shrink-0 text-white/55" />
            <p className="truncate text-sm font-medium text-white">
              {mergeRequest.title}
            </p>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-white/50">
            <Avatar className="h-5 w-5 border border-white/10">
              <AvatarImage
                src={mergeRequest.authorProfile.image ?? undefined}
                alt={mergeRequest.author}
              />
              <AvatarFallback className="text-[10px]">
                {getInitials(mergeRequest.author) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{mergeRequest.author}</span>
            <span className="shrink-0">.</span>
            <span className="shrink-0">
              {formatDistanceToNow(new Date(mergeRequest.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
        <MRStatusBadge status={mergeRequest.status} className="shrink-0" />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-white/45">
        <span>
          {changedFilesCount} file{changedFilesCount === 1 ? "" : "s"}
        </span>
        {mergeRequest.changes[0] ? (
          <>
            <span>.</span>
            <span
              className="min-w-0 truncate"
              title={mergeRequest.changes[0].path}
            >
              {mergeRequest.changes[0].path}
            </span>
          </>
        ) : null}
      </div>
    </button>
  );
}
