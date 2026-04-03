export type TemplateKind =
  | "REACT"
  | "NEXTJS"
  | "EXPRESS"
  | "VUE"
  | "HONO"
  | "ANGULAR";

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
  createdAt: string;
  updatedAt: string;
  userId: string;
  Starmark: Array<{ isMarked: boolean }>;
  user: ProjectUser;
};

export type SidebarProject = {
  id: string;
  name: string;
  starred: boolean;
  icon: string;
};
