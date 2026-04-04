import type { FileSystemTree } from "@webcontainer/api";
import type { TemplateFolder } from "../playground/types";

export type GitHubRepositorySummary = {
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
};

export type GitHubImportProjectType =
  | "Next.js"
  | "Vite"
  | "React"
  | "Express"
  | "Vue"
  | "Angular"
  | "Hono"
  | "Node.js"
  | "Unknown";

export type GitHubSkippedFile = {
  path: string;
  reason: "ignored" | "too_large" | "binary" | "limit" | "unsupported";
  size?: number;
};

export type GitHubReposResponse = {
  repositories: GitHubRepositorySummary[];
  cached: boolean;
  cachedAt: string;
  expiresAt: string;
};

export type GitHubRepoFilesResponse = {
  repository: GitHubRepositorySummary;
  branch: string;
  templateData: TemplateFolder;
  fileStructure: FileSystemTree;
  preferredOpenPath: string | null;
  projectType: GitHubImportProjectType;
  stats: {
    importedFileCount: number;
    skippedFileCount: number;
    truncated: boolean;
  };
  skippedFiles: GitHubSkippedFile[];
};
