"use client";

export type MRStatus = "pending" | "approved" | "rejected";
export type MergeRequestStatus = MRStatus;

export type MergeRequestAuthor = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  role?: string;
};

export type MergeRequestChange = {
  path: string;
  patch: string;
  oldContent?: string;
  newContent?: string;
  language?: string;
  additions: number;
  deletions: number;
};

export type MergeRequest = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  status: MRStatus;
  changes: MergeRequestChange[];
  authorProfile: MergeRequestAuthor;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMergeRequestChange = {
  path: string;
  name: string;
  oldContent: string;
  newContent: string;
  language?: string;
};

export type MergeRequestFilter = "all" | MRStatus;

export type MergeRequestUser = {
  id?: string;
  userId?: string;
  name: string;
  role: "admin" | "user" | "OWNER" | "ADMIN" | "MEMBER";
};
