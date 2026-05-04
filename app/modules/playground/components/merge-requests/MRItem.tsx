"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock3,
  GitPullRequest,
  Loader2,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MRStatusBadge } from "./MRStatusBadge";
import type { MergeRequest } from "./types";

type MRItemProps = {
  mergeRequest: MergeRequest;
  isSelected: boolean;
  canReview: boolean;
  isUpdating: boolean;
  onSelect: (mergeRequest: MergeRequest) => void;
  onAccept: (mergeRequest: MergeRequest) => void;
  onReject: (mergeRequest: MergeRequest) => void;
};

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

function getReviewActionLabel(status: MergeRequest["status"]) {
  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return null;
}

export function MRItem({
  mergeRequest,
  isSelected,
  canReview,
  isUpdating,
  onSelect,
  onAccept,
  onReject,
}: MRItemProps) {
  const changedFilesCount = mergeRequest.changes.length;
  const reviewActionLabel = getReviewActionLabel(mergeRequest.status);

  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-lg border text-left transition duration-150",
        "hover:border-white/20 hover:bg-white/[0.07]",
        isSelected
          ? "border-sky-400/35 bg-sky-400/10"
          : "border-white/10 bg-white/[0.035]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(mergeRequest)}
        className="w-full min-w-0 p-3 text-left"
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

      {mergeRequest.status === "pending" ? (
        canReview ? (
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-emerald-400/25 bg-emerald-400/10 text-xs text-emerald-100 hover:bg-emerald-400/15 hover:text-white"
              disabled={isUpdating}
              onClick={() => onAccept(mergeRequest)}
            >
              {isUpdating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-red-400/25 bg-red-400/10 text-xs text-red-100 hover:bg-red-400/15 hover:text-white"
              disabled={isUpdating}
              onClick={() => onReject(mergeRequest)}
            >
              {isUpdating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Reject
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-xs text-yellow-100">
            <Clock3 className="h-3.5 w-3.5" />
            Waiting for admin approval
          </div>
        )
      ) : reviewActionLabel &&
        mergeRequest.reviewerProfile &&
        mergeRequest.reviewedAt ? (
        <div className="border-t border-white/10 px-3 py-2 text-xs text-white/45">
          {reviewActionLabel} by{" "}
          <span className="text-white/70">
            {mergeRequest.reviewerProfile.name}
          </span>
        </div>
      ) : null}
    </div>
  );
}
