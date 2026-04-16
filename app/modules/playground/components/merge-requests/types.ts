"use client";

export type MergeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MergeRequestAuthor = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
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
  description: string | null;
  status: MergeRequestStatus;
  changes: MergeRequestChange[];
  author: MergeRequestAuthor;
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

export type MergeRequestFilter = "ALL" | MergeRequestStatus;

