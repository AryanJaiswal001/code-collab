"use client";

import { ShieldCheck, UsersRound } from "lucide-react";
import { OptionCard } from "./OptionCard";
import type { WorkspaceRuleMode } from "./types";

type WorkspaceRulesStepProps = {
  value: WorkspaceRuleMode | null;
  onChange: (mode: WorkspaceRuleMode) => void;
};

export function WorkspaceRulesStep({
  value,
  onChange,
}: WorkspaceRulesStepProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OptionCard
        title="Strict"
        description="Use controlled permissions, tighter edit ownership, and a more guided collaboration model."
        icon={ShieldCheck}
        isSelected={value === "STRICT"}
        badge="Guardrails"
        onClick={() => onChange("STRICT")}
      />
      <OptionCard
        title="Lenient"
        description="Keep the workspace open for faster iteration and a more free-form collaboration experience."
        icon={UsersRound}
        isSelected={value === "LENIENT"}
        badge="Flexible"
        onClick={() => onChange("LENIENT")}
      />
    </div>
  );
}
