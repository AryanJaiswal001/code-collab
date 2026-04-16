"use client";

import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, GitPullRequest, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MergeRequest, MergeRequestStatus } from "./types";

type MRItemProps = {
  mergeRequest: MergeRequest;
  isSelected: boolean;
  onSelect: (mergeRequest: MergeRequest) => void;
};

const statusMeta: Record<
  MergeRequestStatus,
  {
    label: string;
    icon: typeof GitPullRequest;
    className: string;
  }
> = {
  PENDING: {
    label: "Open",
    icon: GitPullRequest,
    className: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "border-red-400/30 bg-red-400/10 text-red-200",
  },
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
  const meta = statusMeta[mergeRequest.status];
  const StatusIcon = meta.icon;
  const changedFilesCount = mergeRequest.changes.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(mergeRequest)}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition duration-150",
        "hover:border-white/20 hover:bg-white/[0.07]",
        isSelected
          ? "border-sky-400/35 bg-sky-400/10"
          : "border-white/10 bg-white/[0.035]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <StatusIcon className="h-4 w-4 shrink-0 text-white/55" />
            <p className="truncate text-sm font-medium text-white">
              {mergeRequest.title}
            </p>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-white/50">
            <Avatar className="h-5 w-5 border border-white/10">
              <AvatarImage
                src={mergeRequest.author.image ?? undefined}
                alt={mergeRequest.author.name}
              />
              <AvatarFallback className="text-[10px]">
                {getInitials(mergeRequest.author.name) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{mergeRequest.author.name}</span>
            <span className="shrink-0">.</span>
            <span className="shrink-0">
              {formatDistanceToNow(new Date(mergeRequest.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", meta.className)}>
          {meta.label}
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-white/45">
        <span>
          {changedFilesCount} file{changedFilesCount === 1 ? "" : "s"}
        </span>
        {mergeRequest.changes[0] ? (
          <>
            <span>.</span>
            <span className="truncate">{mergeRequest.changes[0].path}</span>
          </>
        ) : null}
      </div>
    </button>
  );
}

