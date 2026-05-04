"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Filter, GitPullRequest, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchMergeRequests, updateMergeRequestStatus } from "./api";
import { CreateMRModal } from "./CreateMRModal";
import { MRDetail } from "./MRDetail";
import { MRList } from "./MRList";
import { useUserRole } from "./useUserRole";
import type {
  MergeRequestUser,
  MergeRequest,
  MergeRequestFilter,
  MergeRequestStatus,
  WorkspaceMergeRequestChange,
} from "./types";

type MRPanelProps = {
  workspaceId?: string;
  isActive?: boolean;
  refreshKey?: number;
  fileChanges?: WorkspaceMergeRequestChange[];
  currentUser?: MergeRequestUser;
  onPendingCountChange?: (count: number) => void;
  onMergeRequestCreated?: () => void;
  onMergeRequestAccepted?: (mergeRequest: MergeRequest) => void;
  className?: string;
};

const filterLabels: Record<MergeRequestFilter, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  all: "All",
};

function getStatusCount(
  mergeRequests: MergeRequest[],
  status: MergeRequestStatus,
) {
  return mergeRequests.filter((mergeRequest) => mergeRequest.status === status)
    .length;
}

export function MRPanel({
  workspaceId: providedWorkspaceId,
  isActive = true,
  refreshKey = 0,
  fileChanges = [],
  currentUser,
  onPendingCountChange,
  onMergeRequestCreated,
  onMergeRequestAccepted,
  className,
}: MRPanelProps) {
  const params = useParams() as { id?: string };
  const { canReviewMergeRequests } = useUserRole(currentUser);
  const workspaceId = providedWorkspaceId ?? params.id ?? "";
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([]);
  const [selectedMergeRequestId, setSelectedMergeRequestId] = useState<
    string | null
  >(null);
  const [filter, setFilter] = useState<MergeRequestFilter>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingMergeRequestId, setUpdatingMergeRequestId] = useState<
    string | null
  >(null);

  const selectedMergeRequest = useMemo(
    () =>
      mergeRequests.find(
        (mergeRequest) => mergeRequest.id === selectedMergeRequestId,
      ) ?? null,
    [mergeRequests, selectedMergeRequestId],
  );

  const filteredMergeRequests = useMemo(() => {
    if (filter === "all") {
      return mergeRequests;
    }

    return mergeRequests.filter(
      (mergeRequest) => mergeRequest.status === filter,
    );
  }, [filter, mergeRequests]);

  const pendingCount = useMemo(
    () => getStatusCount(mergeRequests, "pending"),
    [mergeRequests],
  );

  const loadMergeRequests = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextMergeRequests = await fetchMergeRequests(workspaceId);
      setMergeRequests(nextMergeRequests);
      setHasFetched(true);
      setSelectedMergeRequestId((currentSelectedId) =>
        currentSelectedId &&
        !nextMergeRequests.some(
          (mergeRequest) => mergeRequest.id === currentSelectedId,
        )
          ? null
          : currentSelectedId,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load merge requests.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void loadMergeRequests();
  }, [isActive, loadMergeRequests, refreshKey]);

  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [onPendingCountChange, pendingCount]);

  async function handleStatusChange(
    mergeRequest: MergeRequest,
    status: Extract<MergeRequestStatus, "accepted" | "rejected">,
  ) {
    const actionLabel = status === "accepted" ? "accept" : "reject";

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} "${mergeRequest.title}"?`,
      )
    ) {
      return;
    }

    setUpdatingMergeRequestId(mergeRequest.id);
    const previousMergeRequests = mergeRequests;

    setMergeRequests((currentMergeRequests) =>
      currentMergeRequests.map((currentMergeRequest) =>
        currentMergeRequest.id === mergeRequest.id
          ? { ...currentMergeRequest, status }
          : currentMergeRequest,
      ),
    );

    try {
      const updatedMergeRequest = await updateMergeRequestStatus(
        workspaceId,
        mergeRequest.id,
        status,
      );

      setMergeRequests((currentMergeRequests) =>
        currentMergeRequests.map((currentMergeRequest) =>
          currentMergeRequest.id === updatedMergeRequest.id
            ? updatedMergeRequest
            : currentMergeRequest,
        ),
      );
      toast.success(
        status === "accepted"
          ? "Merge request accepted"
          : "Merge request rejected",
      );

      if (status === "accepted") {
        onMergeRequestAccepted?.(updatedMergeRequest);
      }
    } catch (updateError) {
      setMergeRequests(previousMergeRequests);
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update merge request.",
      );
    } finally {
      setUpdatingMergeRequestId(null);
    }
  }

  function handleCreated(mergeRequest: MergeRequest) {
    setMergeRequests((currentMergeRequests) => [
      mergeRequest,
      ...currentMergeRequests.filter((item) => item.id !== mergeRequest.id),
    ]);
    setSelectedMergeRequestId(mergeRequest.id);
    setFilter("pending");
    onMergeRequestCreated?.();
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="shrink-0 border-b border-white/10 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-white/45" />
              <p className="truncate text-sm font-semibold text-white">
                Merge Requests
              </p>
              {pendingCount ? (
                <Badge
                  variant="outline"
                  className="border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
                >
                  {pendingCount} pending
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-white/45">
              Review changes before they land in the workspace.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-lg border border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            New MR
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as MergeRequestFilter)}
          >
            <SelectTrigger className="h-8 flex-1 rounded-lg border-white/10 bg-white/[0.04] text-xs text-white">
              <Filter className="h-3.5 w-3.5 text-white/45" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101827] text-white">
              {(Object.keys(filterLabels) as MergeRequestFilter[]).map(
                (filterValue) => (
                  <SelectItem key={filterValue} value={filterValue}>
                    {filterLabels[filterValue]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => void loadMergeRequests()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span className="sr-only">Refresh merge requests</span>
          </Button>
        </div>
      </div>

      {selectedMergeRequest ? (
        <MRDetail
          mergeRequest={selectedMergeRequest}
          isUpdating={updatingMergeRequestId === selectedMergeRequest.id}
          canReview={canReviewMergeRequests}
          onBack={() => setSelectedMergeRequestId(null)}
          onAccept={(mergeRequest) =>
            void handleStatusChange(mergeRequest, "accepted")
          }
          onReject={(mergeRequest) =>
            void handleStatusChange(mergeRequest, "rejected")
          }
        />
      ) : (
        <ScrollArea className="ide-scrollbar min-h-0 flex-1">
          <MRList
            mergeRequests={filteredMergeRequests}
            selectedMergeRequestId={selectedMergeRequestId}
            isLoading={isLoading || (isActive && !hasFetched)}
            error={error}
            canReview={canReviewMergeRequests}
            updatingMergeRequestId={updatingMergeRequestId}
            onRetry={() => void loadMergeRequests()}
            onSelectMergeRequest={(mergeRequest) =>
              setSelectedMergeRequestId(mergeRequest.id)
            }
            onAccept={(mergeRequest) =>
              void handleStatusChange(mergeRequest, "accepted")
            }
            onReject={(mergeRequest) =>
              void handleStatusChange(mergeRequest, "rejected")
            }
          />
        </ScrollArea>
      )}

      <CreateMRModal
        open={isCreateOpen}
        workspaceId={workspaceId}
        fileChanges={fileChanges}
        onOpenChange={setIsCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
