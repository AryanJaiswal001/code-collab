"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MergeRequest } from "./types";

type MRAdminActionsProps = {
  mergeRequest: MergeRequest;
  isUpdating: boolean;
  onAccept: (mergeRequest: MergeRequest) => void;
  onReject: (mergeRequest: MergeRequest) => void;
};

export function MRAdminActions({
  mergeRequest,
  isUpdating,
  onAccept,
  onReject,
}: MRAdminActionsProps) {
  if (mergeRequest.status !== "pending") {
    return null;
  }

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 p-3">
      <Button
        type="button"
        variant="outline"
        className="rounded-lg border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15 hover:text-white"
        disabled={isUpdating}
        onClick={() => onAccept(mergeRequest)}
      >
        {isUpdating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Accept
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
  );
}
