"use client";

import { GitPullRequest, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MergeRequest } from "./types";
import { MRItem } from "./MRItem";

type MRListProps = {
  mergeRequests: MergeRequest[];
  selectedMergeRequestId: string | null;
  isLoading: boolean;
  error: string | null;
  canReview: boolean;
  updatingMergeRequestId: string | null;
  onRetry: () => void;
  onSelectMergeRequest: (mergeRequest: MergeRequest) => void;
  onAccept: (mergeRequest: MergeRequest) => void;
  onReject: (mergeRequest: MergeRequest) => void;
};

function MRListSkeleton() {
  return (
    <div className="space-y-3 px-3 py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-5 w-16 rounded-full bg-white/10" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full bg-white/10" />
            <Skeleton className="h-3 w-24 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MRList({
  mergeRequests,
  selectedMergeRequestId,
  isLoading,
  error,
  canReview,
  updatingMergeRequestId,
  onRetry,
  onSelectMergeRequest,
  onAccept,
  onReject,
}: MRListProps) {
  if (isLoading) {
    return <MRListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="rounded-full border border-red-400/20 bg-red-400/10 p-3 text-red-200">
          <GitPullRequest className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            Merge requests did not load
          </p>
          <p className="mt-1 text-xs leading-5 text-white/50">{error}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={onRetry}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!mergeRequests.length) {
    return (
      <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 px-4 text-center text-white/45">
        <div className="rounded-full border border-white/10 bg-white/5 p-3">
          <GitPullRequest className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/70">
            No merge requests yet
          </p>
          <p className="mt-1 text-xs leading-5">
            Open a request when your workspace changes are ready for review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3 py-4">
      {mergeRequests.map((mergeRequest) => (
        <MRItem
          key={mergeRequest.id}
          mergeRequest={mergeRequest}
          isSelected={selectedMergeRequestId === mergeRequest.id}
          canReview={canReview}
          isUpdating={updatingMergeRequestId === mergeRequest.id}
          onSelect={onSelectMergeRequest}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
