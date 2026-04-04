"use client";

import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type OptionCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  isSelected: boolean;
  badge?: string;
  onClick: () => void;
};

export function OptionCard({
  title,
  description,
  icon: Icon,
  isSelected,
  badge,
  onClick,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col gap-4 rounded-[1.75rem] border px-5 py-5 text-left transition-all duration-200",
        "hover:border-primary/40 hover:bg-primary/[0.03]",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        isSelected
          ? "border-primary bg-primary/[0.06] shadow-[0_18px_50px_-30px_rgba(37,99,235,0.75)]"
          : "border-border/80 bg-card/60",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {isSelected ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : badge ? (
          <span className="rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}
