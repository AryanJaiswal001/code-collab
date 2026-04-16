"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  FileCode2,
  GitPullRequest,
  Loader2,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  MergeRequest,
  MergeRequestChange,
  MergeRequestStatus,
} from "./types";

type MRDetailProps = {
  mergeRequest: MergeRequest;
  isUpdating: boolean;
  onBack: () => void;
  onApprove: (mergeRequest: MergeRequest) => void;
  onReject: (mergeRequest: MergeRequest) => void;
};

const statusClasses: Record<MergeRequestStatus, string> = {
  PENDING: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  APPROVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  REJECTED: "border-red-400/30 bg-red-400/10 text-red-200",
};

const statusLabels: Record<MergeRequestStatus, string> = {
  PENDING: "Open",
  APPROVED: "Approved",
  REJECTED: "Rejected",
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
  onBack,
  onApprove,
  onReject,
}: MRDetailProps) {
  const isOpen = mergeRequest.status === "PENDING";

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
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarImage
                    src={mergeRequest.author.image ?? undefined}
                    alt={mergeRequest.author.name}
                  />
                  <AvatarFallback>
                    {getInitials(mergeRequest.author.name) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {mergeRequest.author.name}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    opened{" "}
                    {formatDistanceToNow(new Date(mergeRequest.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("shrink-0", statusClasses[mergeRequest.status])}
              >
                {statusLabels[mergeRequest.status]}
              </Badge>
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

      {isOpen ? (
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 p-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15 hover:text-white"
            disabled={isUpdating}
            onClick={() => onApprove(mergeRequest)}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-red-400/25 bg-red-400/10 text-red-100 hover:bg-red-400/15 hover:text-white"
            disabled={isUpdating}
            onClick={() => onReject(mergeRequest)}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}

