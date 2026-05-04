"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Clock3,
  FileCode2,
  GitPullRequest,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MRAdminActions } from "./MRAdminActions";
import { MRStatusBadge } from "./MRStatusBadge";
import type { MergeRequest, MergeRequestChange } from "./types";

type MRDetailProps = {
  mergeRequest: MergeRequest;
  isUpdating: boolean;
  canReview: boolean;
  onBack: () => void;
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

function getDiffLineClassName(line: string) {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return "bg-white/[0.04] text-white/55";
  }

  if (line.startsWith("+")) {
    return "bg-emerald-400/10 text-emerald-100";
  }

  if (line.startsWith("-")) {
    return "bg-red-400/10 text-red-100";
  }

  if (line.startsWith("@@")) {
    return "bg-sky-400/10 text-sky-100";
  }

  return "text-white/70";
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

function DiffBlock({ change }: { change: MergeRequestChange }) {
  const lines = change.patch.split("\n");

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#090d1a]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.035] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2 className="h-4 w-4 shrink-0 text-white/45" />
          <p className="truncate text-xs font-medium text-white/80">
            {change.path}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <span className="text-emerald-200">+{change.additions}</span>
          <span className="text-red-200">-{change.deletions}</span>
        </div>
      </div>
      <pre className="ide-scrollbar max-h-[24rem] overflow-auto p-0 text-[11px] leading-5">
        {lines.map((line, index) => (
          <code
            key={`${index}-${line}`}
            className={cn(
              "block min-w-max px-3 font-mono",
              getDiffLineClassName(line),
            )}
          >
            {line || " "}
          </code>
        ))}
      </pre>
    </div>
  );
}

export function MRDetail({
  mergeRequest,
  isUpdating,
  canReview,
  onBack,
  onAccept,
  onReject,
}: MRDetailProps) {
  const reviewActionLabel = getReviewActionLabel(mergeRequest.status);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-lg px-2 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {mergeRequest.title}
          </p>
        </div>
      </div>

      <ScrollArea className="ide-scrollbar min-h-0 flex-1">
        <div className="space-y-4 px-4 py-4">
          <MRStatusBadge status={mergeRequest.status} prominent />

          {reviewActionLabel &&
          mergeRequest.reviewerProfile &&
          mergeRequest.reviewedAt ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/70">
              {reviewActionLabel} by{" "}
              <span className="font-medium text-white">
                {mergeRequest.reviewerProfile.name}
              </span>{" "}
              {formatDistanceToNow(new Date(mergeRequest.reviewedAt), {
                addSuffix: true,
              })}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarImage
                    src={mergeRequest.authorProfile.image ?? undefined}
                    alt={mergeRequest.author}
                  />
                  <AvatarFallback>
                    {getInitials(mergeRequest.author) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {mergeRequest.author}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    opened{" "}
                    {formatDistanceToNow(new Date(mergeRequest.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
                {mergeRequest.description || "No description provided."}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                  File Changes
                </p>
                <p className="mt-1 text-xs text-white/45">
                  {mergeRequest.changes.length} file
                  {mergeRequest.changes.length === 1 ? "" : "s"} changed
                </p>
              </div>
              <GitPullRequest className="h-4 w-4 text-white/35" />
            </div>

            {mergeRequest.changes.length ? (
              mergeRequest.changes.map((change, index) => (
                <DiffBlock key={`${change.path}-${index}`} change={change} />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
                No parsable patch data is attached to this merge request.
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {canReview ? (
        <MRAdminActions
          mergeRequest={mergeRequest}
          isUpdating={isUpdating}
          onAccept={onAccept}
          onReject={onReject}
        />
      ) : mergeRequest.status === "pending" ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-3 text-sm text-yellow-100">
          <Clock3 className="h-4 w-4" />
          Waiting for admin approval
        </div>
      ) : null}
    </div>
  );
}
