"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderGit2, LayoutTemplate, Lock, Sparkles } from "lucide-react";
import { GitHubRepositoryPicker } from "@/app/modules/github/components/github-repository-picker";
import { useGitHubRepositories } from "@/app/modules/github/hooks/useGitHubRepositories";
import type { GitHubRepositorySummary } from "@/app/modules/github/types";
import { OptionCard } from "./OptionCard";
import type {
  ProjectSetupMode,
  WorkspaceTemplate,
} from "./types";
import { TemplateMenu } from "./TemplateMenu";

type ProjectSetupStepProps = {
  value: ProjectSetupMode | null;
  githubConnected: boolean;
  selectedRepository: GitHubRepositorySummary | null;
  selectedTemplate: WorkspaceTemplate | null;
  onChange: (mode: ProjectSetupMode) => void;
  onConnectGitHub: () => void;
  onSelectRepository: (repository: GitHubRepositorySummary) => void;
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
  const { repositories, isLoading, error, fetchRepositories } = useGitHubRepositories({
    enabled: value === "GITHUB" && githubConnected,
  });

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
                    Search your GitHub repositories and pick the codebase you
                    want to open as a shared workspace.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit rounded-full px-3 py-1"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="mr-1 h-3.5 w-3.5 animate-pulse" />
                      Loading repos
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      GitHub connected
                    </>
                  )}
                </Badge>
              </div>

              <GitHubRepositoryPicker
                repositories={repositories}
                selectedRepository={selectedRepository}
                isLoading={isLoading}
                error={error}
                onRefresh={() => {
                  void fetchRepositories(true).catch(() => undefined);
                }}
                onSelectRepository={onSelectRepository}
              />

              {selectedRepository ? (
                <div className="flex items-center gap-2 rounded-[1.25rem] border border-emerald-400/25 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
                  <FolderGit2 className="h-4 w-4" />
                  <span className="font-medium">
                    {selectedRepository.full_name}
                  </span>
                  {selectedRepository.private ? (
                    <Badge variant="secondary">
                      <Lock className="mr-1 h-3 w-3" />
                      Private
                    </Badge>
                  ) : (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
