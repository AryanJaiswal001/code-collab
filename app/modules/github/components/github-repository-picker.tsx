"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { FolderGit2, Lock, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { GitHubRepositorySummary } from "../types";

type GitHubRepositoryPickerProps = {
  repositories: GitHubRepositorySummary[];
  selectedRepository: GitHubRepositorySummary | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectRepository: (repository: GitHubRepositorySummary) => void;
  className?: string;
};

export function GitHubRepositoryPicker({
  repositories,
  selectedRepository,
  isLoading,
  error,
  onRefresh,
  onSelectRepository,
  className,
}: GitHubRepositoryPickerProps) {
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearch = deferredSearchValue.trim().toLowerCase();

  const filteredRepositories = useMemo(() => {
    if (!normalizedSearch) {
      return repositories;
    }

    return repositories.filter((repository) => {
      const searchableValues = [
        repository.name,
        repository.full_name,
        repository.default_branch,
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [normalizedSearch, repositories]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search repositories"
            className="pl-9"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-2xl"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-destructive/25 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Unable to load repositories
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-border/70 bg-card/70">
        <ScrollArea className="max-h-80">
          <div className="grid gap-3 p-3">
            {isLoading && !repositories.length ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                <Spinner className="h-5 w-5" />
                <p>Fetching your repositories from GitHub...</p>
              </div>
            ) : null}

            {!isLoading && !filteredRepositories.length ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/15 px-5 text-center">
                <FolderGit2 className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {repositories.length
                      ? "No repositories match that search."
                      : "No repositories available yet."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {repositories.length
                      ? "Try a different name, branch, or owner filter."
                      : "Check your GitHub permissions and try refreshing."}
                  </p>
                </div>
              </div>
            ) : null}

            {filteredRepositories.map((repository) => {
              const isSelected =
                selectedRepository?.full_name === repository.full_name;

              return (
                <button
                  key={repository.full_name}
                  type="button"
                  onClick={() => onSelectRepository(repository)}
                  className={cn(
                    "flex flex-col gap-3 rounded-[1.25rem] border px-4 py-4 text-left transition-all",
                    "hover:border-primary/40 hover:bg-primary/3",
                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    isSelected
                      ? "border-primary bg-primary/6"
                      : "border-border/70 bg-background/50",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {repository.full_name}
                    </span>
                    {repository.private ? (
                      <Badge variant="secondary">
                        <Lock className="mr-1 h-3 w-3" />
                        Private
                      </Badge>
                    ) : (
                      <Badge variant="outline">Public</Badge>
                    )}
                    <Badge variant="outline">
                      {repository.default_branch}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{repository.name}</span>
                    <span>
                      {isSelected ? "Selected" : "Choose this repository"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
