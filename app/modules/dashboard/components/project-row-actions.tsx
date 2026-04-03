"use client";

import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProjectRowActionsProps = {
  isStarred: boolean;
  onRenameProject: () => void;
  onToggleStar: () => void;
  onDeleteProject: () => void;
};

const ProjectRowActions = ({
  isStarred,
  onRenameProject,
  onToggleStar,
  onDeleteProject,
}: ProjectRowActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
          onClick={(event) => event.stopPropagation()}
          aria-label="Project actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-45"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onSelect={onRenameProject}>
          <Pencil className="h-4 w-4" />
          Rename project
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleStar}>
          <Star className="h-4 w-4" />
          {isStarred ? "Unstar Project" : "Star Project"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDeleteProject}>
          <Trash2 className="h-4 w-4" />
          Delete Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProjectRowActions;
