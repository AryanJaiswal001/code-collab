"use client";

import { CheckCircle2, Circle, Clock3, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MRStatus } from "./types";

type MRStatusBadgeProps = {
  status: MRStatus;
  prominent?: boolean;
  className?: string;
};

const statusMeta: Record<
  MRStatus,
  {
    label: string;
    compactLabel: string;
    icon: typeof Circle;
    className: string;
  }
> = {
  pending: {
    label: "Waiting for Admin Approval",
    compactLabel: "Pending",
    icon: Clock3,
    className: "border-yellow-400/35 bg-yellow-400/10 text-yellow-100",
  },
  approved: {
    label: "Approved",
    compactLabel: "Approved",
    icon: CheckCircle2,
    className: "border-emerald-400/35 bg-emerald-400/10 text-emerald-100",
  },
  rejected: {
    label: "Rejected",
    compactLabel: "Rejected",
    icon: XCircle,
    className: "border-red-400/35 bg-red-400/10 text-red-100",
  },
};

export function MRStatusBadge({
  status,
  prominent = false,
  className,
}: MRStatusBadgeProps) {
  const meta = statusMeta[status];
  const StatusIcon = meta.icon;
  const label = prominent ? meta.label : meta.compactLabel;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-lg",
        meta.className,
        prominent ? "h-auto px-3 py-2 text-sm" : "max-w-[9rem]",
        className,
      )}
    >
      <StatusIcon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </Badge>
  );
}
