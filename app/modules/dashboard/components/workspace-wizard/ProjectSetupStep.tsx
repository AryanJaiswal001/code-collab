"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderGit2, LayoutTemplate, Lock, Sparkles } from "lucide-react";
import { OptionCard } from "./OptionCard";
import type {
  MockRepository,
  ProjectSetupMode,
  WorkspaceTemplate,
} from "./types";
import { mockRepositories } from "./types";
import { cn } from "@/lib/utils";
import { TemplateMenu } from "./TemplateMenu";

type ProjectSetupStepProps = {
  value: ProjectSetupMode | null;
  githubConnected: boolean;
  selectedRepository: MockRepository | null;
  selectedTemplate: WorkspaceTemplate | null;
  onChange: (mode: ProjectSetupMode) => void;
  onConnectGitHub: () => void;
  onSelectRepository: (repository: MockRepository) => void;
  onSelectTemplate: (template: WorkspaceTemplate) => void;
};

export function ProjectSetupStep({
  value,
  githubConnected,
  selectedRepository,
  selectedTemplate,
  onChange,
  onConnectGitHub,
  onSelectRepository,
  onSelectTemplate,
}: ProjectSetupStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <OptionCard
          title="Template"
          description="Start with a clean Next.js workspace scaffold and shape the collaboration experience from scratch."
          icon={LayoutTemplate}
          isSelected={value === "TEMPLATE"}
          badge="Fastest"
          onClick={() => onChange("TEMPLATE")}
        />
        <OptionCard
          title="Import from GitHub"
          description="Connect GitHub, choose a repository, and create a shared workspace around an existing codebase."
          icon={FolderGit2}
          isSelected={value === "GITHUB"}
          badge="OAuth"
          onClick={() => onChange("GITHUB")}
        />
      </div>

      {value === "TEMPLATE" ? (
        <div className="space-y-4 rounded-[1.75rem] border border-border/80 bg-muted/20 p-5">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Template menu</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Pick a starter template from the menu. This integrates your
              earlier template selector directly into the wizard flow.
            </p>
          </div>
          <TemplateMenu value={selectedTemplate} onChange={onSelectTemplate} />
        </div>
      ) : null}

      {value === "GITHUB" ? (
        <div className="rounded-[1.75rem] border border-border/80 bg-muted/20 p-5">
          {!githubConnected ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-semibold">
                  Connect GitHub to continue
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  We&apos;ll send you through GitHub OAuth and reopen this
                  wizard so you can pick a repository right where you left off.
                </p>
              </div>
              <Button onClick={onConnectGitHub} className="rounded-2xl px-5">
                <FolderGit2 className="mr-2 h-4 w-4" />
                Continue with GitHub
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    Choose a repository
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Mock repository data for now. You can swap this list with
                    real GitHub API data later.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit rounded-full px-3 py-1"
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  GitHub connected
                </Badge>
              </div>

              <div className="grid gap-3">
                {mockRepositories.map((repository) => {
                  const isSelected = selectedRepository?.id === repository.id;

                  return (
                    <button
                      key={repository.id}
                      type="button"
                      onClick={() => onSelectRepository(repository)}
                      className={cn(
                        "flex flex-col gap-3 rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                        "hover:border-primary/40 hover:bg-primary/3",
                        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        isSelected
                          ? "border-primary bg-primary/6"
                          : "border-border/70 bg-card/70",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {repository.fullName}
                        </span>
                        <Badge variant="outline">{repository.language}</Badge>
                        {repository.visibility === "Private" ? (
                          <Badge variant="secondary">
                            <Lock className="mr-1 h-3 w-3" />
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="outline">Public</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>{repository.name}</span>
                        <span>Updated {repository.updatedAt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
