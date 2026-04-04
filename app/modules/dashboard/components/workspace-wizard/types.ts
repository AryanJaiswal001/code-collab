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

export type MockRepository = {
  id: string;
  name: string;
  fullName: string;
  visibility: "Public" | "Private";
  updatedAt: string;
  language: string;
};

export type WorkspaceDraft = {
  projectName: string;
  projectDescription: string;
  workspaceMode: WorkspaceMode | null;
  projectSetupMode: ProjectSetupMode | null;
  selectedTemplate: WorkspaceTemplate | null;
  workspaceRules: WorkspaceRuleMode | null;
  githubConnected: boolean;
  selectedRepository: MockRepository | null;
  inviteEmails: string[];
  workspaceId: string | null;
  shareableLink: string;
};

export const TOTAL_WORKSPACE_STEPS = 5;

export const mockRepositories: MockRepository[] = [
  {
    id: "repo-realtime-editor",
    name: "realtime-editor",
    fullName: "codecollab/realtime-editor",
    visibility: "Private",
    updatedAt: "2 hours ago",
    language: "TypeScript",
  },
  {
    id: "repo-design-system",
    name: "design-system",
    fullName: "codecollab/design-system",
    visibility: "Public",
    updatedAt: "Yesterday",
    language: "Tailwind CSS",
  },
  {
    id: "repo-api-gateway",
    name: "api-gateway",
    fullName: "codecollab/api-gateway",
    visibility: "Private",
    updatedAt: "3 days ago",
    language: "Node.js",
  },
];

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
