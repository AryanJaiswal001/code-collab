import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { transformToWebContainerFormat } from "../webcontainers/hooks/transformer";
import type { TemplateFile, TemplateFolder } from "../playground/types";
import type {
  GitHubImportProjectType,
  GitHubRepoFilesResponse,
  GitHubReposResponse,
  GitHubRepositorySummary,
  GitHubSkippedFile,
} from "./types";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_REPO_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_GITHUB_REPO_PAGES = 10;
const MAX_IMPORTED_FILE_SIZE_BYTES = 1024 * 1024;
const MAX_IMPORTED_FILE_COUNT = 250;
const MAX_IMPORTED_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_SKIPPED_FILE_DETAILS = 50;
const CONTENT_FETCH_CONCURRENCY = 8;
const IGNORED_PATH_SEGMENTS = new Set(["node_modules", ".git"]);

type GitHubSessionContext = {
  accessToken: string;
  userId: string;
};

type CachedRepositories = {
  repositories: GitHubRepositorySummary[];
  fetchedAt: number;
};

type GitHubRepoResponse = {
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
};

type GitHubTreeEntry = {
  path: string;
  size?: number;
  type: string;
};

type GitHubTreeResponse = {
  tree: GitHubTreeEntry[];
  truncated: boolean;
};

type GitHubContentFileResponse = {
  content?: string;
  encoding?: string;
  path: string;
  size?: number;
  type: string;
};

type ImportedGitHubFile = {
  content: string;
  path: string;
};

type MutableTemplateFolder = {
  folderName: string;
  items: MutableTemplateItem[];
};

type MutableTemplateItem = TemplateFile | MutableTemplateFolder;

const repositoryCache = new Map<string, CachedRepositories>();

class GitHubIntegrationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubIntegrationError";
  }
}

function normalizeRepositoryFullName(fullName: string) {
  const normalized = fullName.trim();
  const [owner, repo] = normalized.split("/");

  if (!owner || !repo || normalized.split("/").length !== 2) {
    throw new GitHubIntegrationError(
      "Repository must be provided in the owner/repo format.",
      400,
    );
  }

  return { owner, repo };
}

function encodeGitHubPath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getPathDepth(path: string) {
  return path.split("/").filter(Boolean).length;
}

function getBaseName(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function getPathPriority(path: string) {
  const baseName = getBaseName(path).toLowerCase();

  if (baseName === "package.json") {
    return 0;
  }

  if (baseName === "readme.md" || baseName === "readme") {
    return 1;
  }

  if (
    baseName === "package-lock.json" ||
    baseName === "pnpm-lock.yaml" ||
    baseName === "yarn.lock" ||
    baseName === "bun.lock" ||
    baseName === "bun.lockb" ||
    baseName === "next.config.js" ||
    baseName === "next.config.ts" ||
    baseName === "vite.config.js" ||
    baseName === "vite.config.ts" ||
    baseName === "index.js" ||
    baseName === "index.ts" ||
    baseName === "index.tsx"
  ) {
    return 2;
  }

  return 3;
}

function isIgnoredPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.some((segment) => IGNORED_PATH_SEGMENTS.has(segment));
}

function simplifyRepository(repository: GitHubRepoResponse): GitHubRepositorySummary {
  return {
    name: repository.name,
    full_name: repository.full_name,
    private: repository.private,
    default_branch: repository.default_branch,
  };
}

async function resolveSessionUserId() {
  const session = await auth();

  if (!session?.user) {
    throw new GitHubIntegrationError(
      "Sign in before importing a GitHub repository.",
      401,
    );
  }

  if (session.user.id) {
    return session.user.id;
  }

  if (!session.user.email) {
    throw new GitHubIntegrationError(
      "Unable to determine the current user for GitHub imports.",
      401,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user?.id) {
    throw new GitHubIntegrationError(
      "Unable to determine the current user for GitHub imports.",
      401,
    );
  }

  return user.id;
}

async function getGitHubSessionContext(): Promise<GitHubSessionContext> {
  const userId = await resolveSessionUserId();
  const account = await prisma.account.findFirst({
    where: {
      provider: "github",
      userId,
    },
    select: {
      access_token: true,
    },
  });

  if (!account?.access_token) {
    throw new GitHubIntegrationError(
      "Connect GitHub again to grant repository access before importing.",
      403,
    );
  }

  return {
    accessToken: account.access_token,
    userId,
  };
}

async function fetchGitHubJson<T>(
  accessToken: string,
  endpoint: string,
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Code-Collab",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  const payload = await response.json().catch(() => null) as
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload?.message ||
      "GitHub returned an unexpected response while importing the repository.";
    const status =
      response.status === 401 || response.status === 403 || response.status === 404
        ? response.status
        : 502;

    throw new GitHubIntegrationError(message, status);
  }

  return payload as T;
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>,
) {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return results;
}

function parseImportedFileName(filePath: string): TemplateFile {
  const name = getBaseName(filePath);

  if (name.startsWith(".") && !name.slice(1).includes(".")) {
    return {
      filename: name,
      fileExtension: "",
      content: "",
    };
  }

  const lastDotIndex = name.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0 && lastDotIndex < name.length - 1;

  return {
    filename: hasExtension ? name.slice(0, lastDotIndex) : name,
    fileExtension: hasExtension ? name.slice(lastDotIndex + 1) : "",
    content: "",
  };
}

function sortTemplateItems(items: MutableTemplateItem[]) {
  return [...items].sort((left, right) => {
    const leftIsFolder = "folderName" in left;
    const rightIsFolder = "folderName" in right;

    if (leftIsFolder !== rightIsFolder) {
      return leftIsFolder ? -1 : 1;
    }

    const leftName = leftIsFolder
      ? left.folderName
      : left.fileExtension
        ? `${left.filename}.${left.fileExtension}`
        : left.filename;
    const rightName = rightIsFolder
      ? right.folderName
      : right.fileExtension
        ? `${right.filename}.${right.fileExtension}`
        : right.filename;

    return leftName.localeCompare(rightName);
  });
}

function finalizeTemplateFolder(folder: MutableTemplateFolder): TemplateFolder {
  return {
    folderName: folder.folderName,
    items: sortTemplateItems(folder.items).map((item) => {
      if ("folderName" in item) {
        return finalizeTemplateFolder(item);
      }

      return item;
    }),
  };
}

function buildTemplateFromImportedFiles(
  rootFolderName: string,
  files: ImportedGitHubFile[],
) {
  const root: MutableTemplateFolder = {
    folderName: rootFolderName,
    items: [],
  };

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let currentFolder = root;

    for (const segment of segments.slice(0, -1)) {
      let nextFolder = currentFolder.items.find(
        (item): item is MutableTemplateFolder =>
          "folderName" in item && item.folderName === segment,
      );

      if (!nextFolder) {
        nextFolder = {
          folderName: segment,
          items: [],
        };
        currentFolder.items.push(nextFolder);
      }

      currentFolder = nextFolder;
    }

    const parsedFile = parseImportedFileName(file.path);
    currentFolder.items.push({
      ...parsedFile,
      content: file.content,
    });
  }

  return finalizeTemplateFolder(root);
}

function isProbablyBinary(buffer: Buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 1024));

  if (!sample.length) {
    return false;
  }

  let suspiciousByteCount = 0;

  for (const byte of sample) {
    if (byte === 0) {
      return true;
    }

    const isTab = byte === 9;
    const isLineBreak = byte === 10 || byte === 13;
    const isPrintableAscii = byte >= 32 && byte <= 126;
    const isExtended = byte >= 128;

    if (!isPrintableAscii && !isLineBreak && !isTab && !isExtended) {
      suspiciousByteCount += 1;
    }
  }

  return suspiciousByteCount / sample.length > 0.3;
}

function decodeGitHubFileContent(file: GitHubContentFileResponse) {
  if (!file.content) {
    return Buffer.from("");
  }

  if (file.encoding === "base64") {
    return Buffer.from(file.content.replace(/\n/g, ""), "base64");
  }

  if (file.encoding === "utf-8" || !file.encoding) {
    return Buffer.from(file.content, "utf8");
  }

  throw new GitHubIntegrationError(
    `Unsupported GitHub file encoding "${file.encoding}" for ${file.path}.`,
    422,
  );
}

function findPreferredOpenPath(files: ImportedGitHubFile[]) {
  const sortedPaths = files
    .map((file) => file.path)
    .sort((left, right) => {
      const depthDifference = getPathDepth(left) - getPathDepth(right);
      return depthDifference || left.localeCompare(right);
    });

  const readmePath = sortedPaths.find((path) => /^readme(\.[^.]+)?$/i.test(getBaseName(path)));
  if (readmePath) {
    return readmePath;
  }

  for (const preferredName of [
    "index.js",
    "index.tsx",
    "index.ts",
    "index.jsx",
    "main.tsx",
    "main.ts",
    "main.jsx",
    "main.js",
    "package.json",
  ]) {
    const preferredPath = sortedPaths.find(
      (path) => getBaseName(path).toLowerCase() === preferredName,
    );

    if (preferredPath) {
      return preferredPath;
    }
  }

  return sortedPaths[0] ?? null;
}

function detectProjectType(files: ImportedGitHubFile[]): GitHubImportProjectType {
  const packageJsonFile = [...files]
    .filter((file) => getBaseName(file.path) === "package.json")
    .sort((left, right) => {
      const depthDifference = getPathDepth(left.path) - getPathDepth(right.path);
      return depthDifference || left.path.localeCompare(right.path);
    })[0];

  if (packageJsonFile) {
    try {
      const packageJson = JSON.parse(packageJsonFile.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const dependencyNames = new Set([
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
      ]);

      if (dependencyNames.has("next")) {
        return "Next.js";
      }

      if (dependencyNames.has("vite")) {
        return "Vite";
      }

      if (dependencyNames.has("@angular/core")) {
        return "Angular";
      }

      if (dependencyNames.has("vue")) {
        return "Vue";
      }

      if (dependencyNames.has("hono")) {
        return "Hono";
      }

      if (dependencyNames.has("express")) {
        return "Express";
      }

      if (dependencyNames.has("react")) {
        return "React";
      }

      return "Node.js";
    } catch {
      return "Unknown";
    }
  }

  if (files.some((file) => /^next\.config\.(js|mjs|cjs|ts)$/i.test(getBaseName(file.path)))) {
    return "Next.js";
  }

  if (files.some((file) => /^vite\.config\.(js|mjs|cjs|ts)$/i.test(getBaseName(file.path)))) {
    return "Vite";
  }

  return "Unknown";
}

function createEmptyTemplate(folderName: string) {
  return {
    folderName,
    items: [],
  } satisfies TemplateFolder;
}

export function isGitHubIntegrationError(error: unknown): error is GitHubIntegrationError {
  return error instanceof GitHubIntegrationError;
}

export async function getGitHubRepositoriesForCurrentUser(
  forceRefresh = false,
): Promise<GitHubReposResponse> {
  const { accessToken, userId } = await getGitHubSessionContext();
  const cached = repositoryCache.get(userId);
  const now = Date.now();

  if (!forceRefresh && cached && cached.fetchedAt + GITHUB_REPO_CACHE_TTL_MS > now) {
    return {
      repositories: cached.repositories,
      cached: true,
      cachedAt: new Date(cached.fetchedAt).toISOString(),
      expiresAt: new Date(cached.fetchedAt + GITHUB_REPO_CACHE_TTL_MS).toISOString(),
    };
  }

  const repositories: GitHubRepositorySummary[] = [];

  for (let page = 1; page <= MAX_GITHUB_REPO_PAGES; page += 1) {
    const pageRepositories = await fetchGitHubJson<GitHubRepoResponse[]>(
      accessToken,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    );

    repositories.push(...pageRepositories.map(simplifyRepository));

    if (pageRepositories.length < 100) {
      break;
    }
  }

  repositoryCache.set(userId, {
    repositories,
    fetchedAt: now,
  });

  return {
    repositories,
    cached: false,
    cachedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + GITHUB_REPO_CACHE_TTL_MS).toISOString(),
  };
}

export async function importGitHubRepository(
  repositoryFullName: string,
): Promise<GitHubRepoFilesResponse> {
  const { accessToken } = await getGitHubSessionContext();
  const { owner, repo } = normalizeRepositoryFullName(repositoryFullName);
  const repository = simplifyRepository(
    await fetchGitHubJson<GitHubRepoResponse>(
      accessToken,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    ),
  );
  const branch = repository.default_branch;
  const tree = await fetchGitHubJson<GitHubTreeResponse>(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );

  let skippedFileCount = 0;
  const skippedFiles: GitHubSkippedFile[] = [];

  const recordSkippedFile = (file: GitHubSkippedFile) => {
    skippedFileCount += 1;

    if (skippedFiles.length < MAX_SKIPPED_FILE_DETAILS) {
      skippedFiles.push(file);
    }
  };

  let totalImportedBytes = 0;
  let limitReached = false;
  const filesToImport: GitHubTreeEntry[] = [];

  for (const entry of tree.tree
    .filter((entry) => entry.type === "blob" && Boolean(entry.path))
    .sort((left, right) => {
      const priorityDifference = getPathPriority(left.path) - getPathPriority(right.path);
      if (priorityDifference) {
        return priorityDifference;
      }

      const depthDifference = getPathDepth(left.path) - getPathDepth(right.path);
      if (depthDifference) {
        return depthDifference;
      }

      return left.path.localeCompare(right.path);
    })) {
    if (isIgnoredPath(entry.path)) {
      recordSkippedFile({
        path: entry.path,
        reason: "ignored",
        size: entry.size,
      });
      continue;
    }

    if ((entry.size ?? 0) > MAX_IMPORTED_FILE_SIZE_BYTES) {
      recordSkippedFile({
        path: entry.path,
        reason: "too_large",
        size: entry.size,
      });
      continue;
    }

    const wouldExceedFileLimit = filesToImport.length >= MAX_IMPORTED_FILE_COUNT;
    const wouldExceedSizeLimit =
      totalImportedBytes + (entry.size ?? 0) > MAX_IMPORTED_TOTAL_BYTES;

    if (wouldExceedFileLimit || wouldExceedSizeLimit) {
      limitReached = true;
      recordSkippedFile({
        path: entry.path,
        reason: "limit",
        size: entry.size,
      });
      continue;
    }

    totalImportedBytes += entry.size ?? 0;
    filesToImport.push(entry);
  }

  const importedFiles = (
    await mapWithConcurrency(filesToImport, CONTENT_FETCH_CONCURRENCY, async (entry) => {
      const file = await fetchGitHubJson<GitHubContentFileResponse>(
        accessToken,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubPath(entry.path)}?ref=${encodeURIComponent(branch)}`,
      );

      if (file.type !== "file") {
        recordSkippedFile({
          path: entry.path,
          reason: "unsupported",
          size: entry.size,
        });
        return null;
      }

      const buffer = decodeGitHubFileContent(file);

      if (isProbablyBinary(buffer)) {
        recordSkippedFile({
          path: entry.path,
          reason: "binary",
          size: entry.size,
        });
        return null;
      }

      return {
        content: buffer.toString("utf8"),
        path: entry.path,
      } satisfies ImportedGitHubFile;
    })
  ).filter((file): file is ImportedGitHubFile => Boolean(file));

  const templateData = importedFiles.length
    ? buildTemplateFromImportedFiles(repository.name, importedFiles)
    : createEmptyTemplate(repository.name);

  return {
    repository,
    branch,
    templateData,
    fileStructure: transformToWebContainerFormat(templateData),
    preferredOpenPath: findPreferredOpenPath(importedFiles),
    projectType: detectProjectType(importedFiles),
    stats: {
      importedFileCount: importedFiles.length,
      skippedFileCount,
      truncated: tree.truncated || limitReached,
    },
    skippedFiles,
  };
}
