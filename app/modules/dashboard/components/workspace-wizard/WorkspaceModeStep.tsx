"use client";

import { BriefcaseBusiness, Users2 } from "lucide-react";
import { OptionCard } from "./OptionCard";
import type { WorkspaceMode } from "./types";

type WorkspaceModeStepProps = {
  value: WorkspaceMode | null;
  onChange: (mode: WorkspaceMode) => void;
};

export function WorkspaceModeStep({
  value,
  onChange,
}: WorkspaceModeStepProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OptionCard
        title="Personal"
        description="A focused workspace for your solo coding sessions, experiments, and private drafts."
        icon={BriefcaseBusiness}
        isSelected={value === "PERSONAL"}
        badge="Solo"
        onClick={() => onChange("PERSONAL")}
      />
      <OptionCard
        title="Collaboration"
        description="Invite teammates, share a live workspace link, and coordinate edits with a group."
        icon={Users2}
        isSelected={value === "COLLABORATION"}
        badge="Team"
        onClick={() => onChange("COLLABORATION")}
      />
    </div>
  );
}
