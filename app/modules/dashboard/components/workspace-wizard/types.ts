import type { GitHubRepositorySummary } from "@/app/modules/github/types";

export type WorkspaceMode = "PERSONAL" | "COLLABORATION";
export type ProjectSetupMode = "TEMPLATE" | "GITHUB";
export type WorkspaceRuleMode = "STRICT" | "LENIENT";
export type WorkspaceTemplate =
  | "REACT"
  | "NEXTJS"
  | "EXPRESS"
  | "VUE"
  | "HONO"
  | "ANGULAR";

export type WorkspaceDraft = {
  projectName: string;
  projectDescription: string;
  workspaceMode: WorkspaceMode | null;
  projectSetupMode: ProjectSetupMode | null;
  selectedTemplate: WorkspaceTemplate | null;
  workspaceRules: WorkspaceRuleMode | null;
  githubConnected: boolean;
  selectedRepository: GitHubRepositorySummary | null;
  inviteEmails: string[];
  workspaceId: string | null;
  shareableLink: string;
};

export const TOTAL_WORKSPACE_STEPS = 5;

export const initialWorkspaceDraft: WorkspaceDraft = {
  projectName: "",
  projectDescription: "",
  workspaceMode: null,
  projectSetupMode: null,
  selectedTemplate: null,
  workspaceRules: null,
  githubConnected: false,
  selectedRepository: null,
  inviteEmails: [],
  workspaceId: null,
  shareableLink: "",
};
