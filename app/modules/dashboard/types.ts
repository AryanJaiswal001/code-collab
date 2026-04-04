export type TemplateKind =
  | "REACT"
  | "NEXTJS"
  | "EXPRESS"
  | "VUE"
  | "HONO"
  | "ANGULAR"
  | "GITHUB";

export type ProjectUser = {
  name: string;
  email: string;
  image: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  template: TemplateKind;
  workspaceMode?: "PERSONAL" | "COLLABORATION";
  projectSetupMode?: "TEMPLATE" | "GITHUB";
  workspaceRules?: "STRICT" | "LENIENT";
  repositoryFullName?: string;
  collaborators?: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  Starmark: Array<{ isMarked: boolean }>;
  user: ProjectUser;
};

export type DashboardProject = {
  id: string;
  name: string;
  description: string;
  techStack: string;
  updatedAt: string;
  isStarred: boolean;
};

export type SidebarProject = {
  id: string;
  name: string;
  starred: boolean;
  icon: string;
};
