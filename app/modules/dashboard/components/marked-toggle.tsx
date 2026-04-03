"use client";

import React, { useEffect, useState, forwardRef } from "react";
import { StarIcon, StarOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toggleStarMarked } from "../actions";

interface MarkedToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  markedForRevision: boolean;
  id: string;
}

const MarkedToggleButton = forwardRef<
  HTMLButtonElement,
  MarkedToggleButtonProps
>(({ markedForRevision, id, onClick, className, children, ...props }, ref) => {
  const [isMarked, setIsMarked] = useState(markedForRevision);

  useEffect(() => {
    setIsMarked(markedForRevision);
  }, [markedForRevision]);

  const handleToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.(event);

    const newMarkedState = !isMarked;
    setIsMarked(newMarkedState);

    try {
      const result = await toggleStarMarked(id, newMarkedState);

      if (result.success && result.isMarked) {
        toast.success("Marked as favorite");
      } else if (result.success && !result.isMarked) {
        toast.success("Removed from favorites");
      } else {
        toast.error("Failed to update favorite status");
        setIsMarked(!newMarkedState);
      }
    } catch {
      toast.error("An error occurred while toggling favorite");
      setIsMarked(!newMarkedState);
    }
  };

  return (
    <Button
      ref={ref}
      className={`flex items-center justify-start w-full px-2 py-1.5 text-sm rounded-md cursor-pointer ${className}`}
      onClick={handleToggle}
      variant="ghost"
      {...props}
    >
      {isMarked ? (
        <StarIcon size={16} className="text-yellow-500 mr-2 fill-yellow-500" />
      ) : (
        <StarOffIcon size={16} className="text-gray-500 mr-2" />
      )}
      {children || (isMarked ? "Remove from favorites" : "Add to favorites")}
    </Button>
  );
});

MarkedToggleButton.displayName = "MarkedToggleButton";

export default MarkedToggleButton;
