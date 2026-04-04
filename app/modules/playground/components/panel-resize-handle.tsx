"use client";

import { GripHorizontal, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type PanelResizeHandleProps = {
  orientation: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  className?: string;
  disabled?: boolean;
};

export function PanelResizeHandle({
  orientation,
  onResize,
  className,
  disabled = false,
}: PanelResizeHandleProps) {
  const isVertical = orientation === "vertical";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "group flex shrink-0 items-center justify-center transition-colors",
        isVertical
          ? "h-full w-[10px] cursor-col-resize touch-none"
          : "h-[10px] w-full cursor-row-resize touch-none",
        disabled && "pointer-events-none opacity-0",
        className,
      )}
      onPointerDown={(event) => {
        if (disabled) {
          return;
        }

        event.preventDefault();

        let previousPosition = isVertical ? event.clientX : event.clientY;
        const nextCursor = isVertical ? "col-resize" : "row-resize";

        document.body.style.userSelect = "none";
        document.body.style.cursor = nextCursor;

        const handlePointerMove = (moveEvent: PointerEvent) => {
          const nextPosition = isVertical ? moveEvent.clientX : moveEvent.clientY;
          const delta = nextPosition - previousPosition;

          if (!delta) {
            return;
          }

          previousPosition = nextPosition;
          onResize(delta);
        };

        const cleanup = () => {
          document.body.style.removeProperty("user-select");
          document.body.style.removeProperty("cursor");
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", cleanup);
          window.removeEventListener("pointercancel", cleanup);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", cleanup);
        window.addEventListener("pointercancel", cleanup);
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/30 transition-colors group-hover:border-white/20 group-hover:bg-white/[0.06] group-hover:text-white/60",
          isVertical ? "h-14 w-2.5" : "h-2.5 w-14",
        )}
      >
        {isVertical ? (
          <GripVertical className="h-3.5 w-3.5" />
        ) : (
          <GripHorizontal className="h-3.5 w-3.5" />
        )}
      </div>
    </div>
  );
}
