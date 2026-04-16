"use client";

import type {
  MergeRequest,
  MergeRequestAuthor,
  MergeRequestChange,
  MergeRequestStatus,
} from "./types";

type RawMergeRequest = Record<string, unknown>;

type CreateMergeRequestInput = {
  title: string;
  description?: string;
  path: string;
  content: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function countPatchLines(patch: string) {
  return patch.split("\n").reduce(
    (result, line) => {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        result.additions += 1;
      }

      if (line.startsWith("-") && !line.startsWith("---")) {
        result.deletions += 1;
      }

      return result;
    },
    { additions: 0, deletions: 0 },
  );
}

function normalizeAuthor(value: unknown): MergeRequestAuthor {
  const author = isRecord(value) ? value : {};
  const email = getNullableString(author.email);
  const name =
    getNullableString(author.name) ??
    email?.split("@")[0] ??
    "Unknown reviewer";

  return {
    id: getString(author.id) || getString(author.userId),
    name,
    email,
    image: getNullableString(author.image),
  };
}

function normalizeChange(value: unknown): MergeRequestChange | null {
  if (typeof value === "string") {
    const counts = countPatchLines(value);

    return {
      path: "Changes",
      patch: value,
      additions: counts.additions,
      deletions: counts.deletions,
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const patch = getString(value.patch);
  const path =
    getString(value.path) ||
    getString(value.filePath) ||
    getString(value.filename) ||
    "Changes";

  if (!patch && !getString(value.newContent) && !getString(value.content)) {
    return null;
  }

  const counts = countPatchLines(patch);

  return {
    path,
    patch:
      patch ||
      `New content for ${path}\n\n${
        getString(value.newContent) || getString(value.content)
      }`,
    oldContent: getString(value.oldContent) || undefined,
    newContent:
      getString(value.newContent) || getString(value.content) || undefined,
    language: getString(value.language) || undefined,
    additions: counts.additions,
    deletions: counts.deletions,
  };
}

function normalizeChanges(value: unknown): MergeRequestChange[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeChange(item))
      .filter((item): item is MergeRequestChange => Boolean(item));
  }

  const singleChange = normalizeChange(value);
  return singleChange ? [singleChange] : [];
}

function normalizeStatus(value: unknown): MergeRequestStatus {
  return value === "APPROVED" || value === "REJECTED" ? value : "PENDING";
}

export function normalizeMergeRequest(value: unknown): MergeRequest {
  const raw = (isRecord(value) ? value : {}) as RawMergeRequest;

  return {
    id: getString(raw.id),
    title: getString(raw.title, "Untitled merge request"),
    description: getNullableString(raw.description),
    status: normalizeStatus(raw.status),
    changes: normalizeChanges(raw.changes),
    author: normalizeAuthor(raw.author),
    workspaceId:
      getString(raw.workspaceId) ||
      getString(raw.playgroundId) ||
      getString(raw.workspaceLink),
    createdAt: getString(raw.createdAt, new Date().toISOString()),
    updatedAt: getString(raw.updatedAt, new Date().toISOString()),
  };
}

function getApiError(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallback;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function fetchMergeRequests(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/merge-requests`, {
    cache: "no-store",
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(getApiError(payload, "Unable to load merge requests."));
  }

  const list = Array.isArray(payload) ? payload : [];
  return list.map(normalizeMergeRequest);
}

export async function createMergeRequest(
  workspaceId: string,
  input: CreateMergeRequestInput,
) {
  const response = await fetch(`/api/workspaces/${workspaceId}/merge-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(getApiError(payload, "Unable to create merge request."));
  }

  return normalizeMergeRequest(
    isRecord(payload) && "mr" in payload ? payload.mr : payload,
  );
}

export async function updateMergeRequestStatus(
  workspaceId: string,
  mrId: string,
  status: Extract<MergeRequestStatus, "APPROVED" | "REJECTED">,
) {
  const response = await fetch(`/api/workspaces/${workspaceId}/merge-requests`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mrId, status }),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(getApiError(payload, "Unable to update merge request."));
  }

  return normalizeMergeRequest(
    isRecord(payload) && "mr" in payload ? payload.mr : payload,
  );
}

