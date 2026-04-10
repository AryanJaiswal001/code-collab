"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Code,
  Plus,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Types corresponding to our DB schema
export type MergeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MergeRequest = {
  id: string;
  title: string;
  description: string | null;
  status: MergeRequestStatus;
  changes: any;
  authorId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export function MergeRequestPanel() {
  const { id: workspaceId } = useParams() as { id: string };
  const { data: session } = useSession();

  const [mrs, setMrs] = useState<MergeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMr, setSelectedMr] = useState<MergeRequest | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const fetchMrs = async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/merge-requests`);
      if (!res.ok) throw new Error("Failed to fetch merge requests");
      const data = await res.json();
      setMrs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMrs();
  }, [workspaceId]);

  const handleAction = async (
    mrId: string,
    action: "APPROVED" | "REJECTED",
  ) => {
    try {
      setIsMutating(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/merge-requests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrId, status: action }),
      });

      if (!res.ok) throw new Error(`Failed to ${action.toLowerCase()} MR`);

      // Update local state
      setMrs((prev) =>
        prev.map((mr) => (mr.id === mrId ? { ...mr, status: action } : mr)),
      );
      if (selectedMr?.id === mrId) {
        setSelectedMr({ ...selectedMr, status: action });
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsMutating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-white/50">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400 p-4 text-center">
        {error}
      </div>
    );
  }

  if (selectedMr) {
    return (
      <div className="flex h-full flex-col min-h-0">
        <div className="flex items-center gap-2 border-b border-white/10 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-white/70 hover:text-white"
            onClick={() => setSelectedMr(null)}
          >
            ← Back
          </Button>
          <div className="flex-1 truncate font-medium text-sm">
            {selectedMr.title}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedMr.author.image || ""} />
                  <AvatarFallback className="text-[10px]">
                    {selectedMr.author.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedMr.author.name}</span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] uppercase font-bold",
                  selectedMr.status === "PENDING" &&
                    "border-blue-500 text-blue-400",
                  selectedMr.status === "APPROVED" &&
                    "border-emerald-500 text-emerald-400",
                  selectedMr.status === "REJECTED" &&
                    "border-red-500 text-red-400",
                )}
              >
                {selectedMr.status}
              </Badge>
            </div>

            {selectedMr.description && (
              <div className="rounded-md bg-white/5 p-3 text-sm text-white/80">
                {selectedMr.description}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Changes
              </h4>
              <div className="rounded-md border border-white/10 bg-[#0d0d0d] overflow-hidden">
                {selectedMr.changes && Array.isArray(selectedMr.changes) ? (
                  selectedMr.changes.map((change: any, i: number) => (
                    <div
                      key={i}
                      className="border-b border-white/5 last:border-0 p-3 text-xs font-mono"
                    >
                      <div className="text-white/60 mb-2 truncate font-bold">
                        {change.filePath}
                      </div>
                      <div className="whitespace-pre-wrap overflow-x-auto text-white/80">
                        {change.patch}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-white/50">
                    No parsable patch data
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {selectedMr.status === "PENDING" && (
          <div className="border-t border-white/10 p-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              disabled={isMutating}
              onClick={() => handleAction(selectedMr.id, "APPROVED")}
            >
              {isMutating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Merge
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              disabled={isMutating}
              onClick={() => handleAction(selectedMr.id, "REJECTED")}
            >
              {isMutating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  }

  const openMrs = mrs.filter((m) => m.status === "PENDING");
  const closedMrs = mrs.filter((m) => m.status !== "PENDING");

  return (
    <ScrollArea className="flex-1 h-full px-3 py-4">
      {mrs.length === 0 ? (
        <div className="flex h-[200px] flex-col items-center justify-center gap-3 text-center text-white/40">
          <div className="rounded-full bg-white/5 p-3">
            <GitPullRequest className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/60">
              No Merge Requests
            </p>
            <p className="text-xs">
              When collaborators push files, they will appear here for review.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {openMrs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">
                Requires Review
              </h3>
              <div className="space-y-2">
                {openMrs.map((mr) => (
                  <button
                    key={mr.id}
                    onClick={() => setSelectedMr(mr)}
                    className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-2">
                        <GitPullRequest className="mt-0.5 h-4 w-4 text-blue-400 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-white/90 line-clamp-1">
                            {mr.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                            <span>{mr.author.name}</span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(mr.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {closedMrs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">
                History
              </h3>
              <div className="space-y-2">
                {closedMrs.map((mr) => (
                  <button
                    key={mr.id}
                    onClick={() => setSelectedMr(mr)}
                    className="w-full text-left rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:bg-white/[0.04]"
                  >
                    <div className="flex gap-2">
                      {mr.status === "APPROVED" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500/70 shrink-0" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 text-red-500/70 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-white/70 line-clamp-1">
                          {mr.title}
                        </div>
                        <div className="mt-1 text-xs text-white/40">
                          {formatDistanceToNow(new Date(mr.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ScrollArea>
  );
}
