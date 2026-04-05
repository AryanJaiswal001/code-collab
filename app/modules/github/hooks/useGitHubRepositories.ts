"use client";

import { useCallback, useEffect, useState } from "react";
import type { GitHubReposResponse, GitHubRepositorySummary } from "../types";

type UseGitHubRepositoriesOptions = {
  enabled?: boolean;
};

type RepoClientCache = {
  expiresAt: number;
  repositories: GitHubRepositorySummary[];
};

let repoClientCache: RepoClientCache | null = null;

export function useGitHubRepositories(
  options: UseGitHubRepositoriesOptions = {},
) {
  const { enabled = true } = options;
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>(
    () => {
      if (repoClientCache && repoClientCache.expiresAt > Date.now()) {
        return repoClientCache.repositories;
      }

      return [];
    },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(() => {
    return Boolean(repoClientCache && repoClientCache.expiresAt > Date.now());
  });

  const fetchRepositories = useCallback(async (refresh = false) => {
    if (!refresh && repoClientCache && repoClientCache.expiresAt > Date.now()) {
      setRepositories(repoClientCache.repositories);
      setError(null);
      setHasLoaded(true);
      return repoClientCache.repositories;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (refresh) {
        searchParams.set("refresh", "1");
      }

      const queryString = searchParams.toString();
      const response = await fetch(
        queryString
          ? `/api/github/repos?${queryString}`
          : "/api/github/repos",
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | GitHubReposResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Unable to load GitHub repositories.",
        );
      }

      if (!payload || !("repositories" in payload)) {
        throw new Error("Unable to load GitHub repositories.");
      }

      const nextRepositories = payload.repositories;
      const expiresAt = payload.expiresAt ? Date.parse(payload.expiresAt) : NaN;

      repoClientCache = {
        repositories: nextRepositories,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 60_000,
      };

      setRepositories(nextRepositories);
      setHasLoaded(true);

      return nextRepositories;
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to load GitHub repositories.";
      setError(message);
      setHasLoaded(true);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || hasLoaded) {
      return;
    }

    let cancelled = false;

    void fetchRepositories().catch((nextError) => {
      if (!cancelled) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load GitHub repositories.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, fetchRepositories, hasLoaded]);

  return {
    repositories,
    isLoading,
    error,
    hasLoaded,
    fetchRepositories,
  };
}
