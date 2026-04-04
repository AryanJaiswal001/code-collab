"use client";

import { LayoutGrid, TextQuote } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProjectBasicsStepProps = {
  projectName: string;
  projectDescription: string;
  onProjectNameChange: (value: string) => void;
  onProjectDescriptionChange: (value: string) => void;
};

export function ProjectBasicsStep({
  projectName,
  projectDescription,
  onProjectNameChange,
  onProjectDescriptionChange,
}: ProjectBasicsStepProps) {
  return (
    <div className="space-y-5 rounded-[1.75rem] border border-border/80 bg-card/70 p-5">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Project basics</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Start by naming your workspace and adding a short description. You can
          edit these details later.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            Project Name
          </Label>
          <Input
            id="workspace-name"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Realtime collaboration workspace"
            className="h-11 rounded-2xl"
          />
        </div>

        <div className="grid gap-2">
          <Label
            htmlFor="workspace-description"
            className="flex items-center gap-2"
          >
            <TextQuote className="h-4 w-4 text-primary" />
            Description (optional)
          </Label>
          <Textarea
            id="workspace-description"
            value={projectDescription}
            onChange={(event) => onProjectDescriptionChange(event.target.value)}
            placeholder="Describe the project goals, team focus, or upcoming work."
            className="min-h-28 rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}
