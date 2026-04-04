import type { FileSystemTree } from "@webcontainer/api";
import type { TemplateFile, TemplateFolder, TemplateItem } from "../../playground/types";
import { isTemplateFolder } from "../../playground/types";

export type SupportedPackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type SupportedRunScript = "dev" | "start" | "preview";

export interface WebContainerCommand {
  command: string;
  args: string[];
  label: string;
}

export interface PreparedWebContainerProject {
  fileSystemTree: FileSystemTree;
  projectRoot: string;
  packageJsonPath: string;
  packageManager: SupportedPackageManager;
  installCommands: WebContainerCommand[];
  runCommand: WebContainerCommand;
  runScript: SupportedRunScript;
}

type IndexedTemplateFile = {
  path: string;
  file: TemplateFile;
};

function getItemName(item: TemplateItem) {
  if (isTemplateFolder(item)) {
    return item.folderName;
  }

  return item.fileExtension
    ? `${item.filename}.${item.fileExtension}`
    : item.filename;
}

function toNode(item: TemplateItem): FileSystemTree[string] {
  if (isTemplateFolder(item)) {
    return {
      directory: item.items.reduce<FileSystemTree>((tree, child) => {
        tree[getItemName(child)] = toNode(child);
        return tree;
      }, {}),
    };
  }

  return {
    file: {
      contents: item.content,
    },
  };
}

function normalizePath(parts: string[]) {
  return parts.filter(Boolean).join("/");
}

function getDirectoryName(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.slice(0, -1).join("/");
}

function indexTemplateFiles(
  folder: TemplateFolder,
  parentPath = "",
): IndexedTemplateFile[] {
  return folder.items.flatMap((item) => {
    const path = normalizePath([parentPath, getItemName(item)]);

    if (isTemplateFolder(item)) {
      return indexTemplateFiles(item, path);
    }

    return [{ path, file: item }];
  });
}

function parsePackageManager(value: unknown): SupportedPackageManager | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const manager = value.split("@")[0]?.trim();
  if (manager === "npm" || manager === "pnpm" || manager === "yarn" || manager === "bun") {
    return manager;
  }

  return null;
}

function getProjectRootFromFiles(files: IndexedTemplateFile[]) {
  const packageJsonCandidates = files
    .filter((file) => file.path.endsWith("package.json"))
    .sort((left, right) => {
      const leftDepth = left.path.split("/").length;
      const rightDepth = right.path.split("/").length;

      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth;
      }

      return left.path.localeCompare(right.path);
    });

  const packageJsonFile = packageJsonCandidates[0];

  if (!packageJsonFile) {
    throw new Error(
      "Imported files are loaded, but preview is unavailable because the repository does not contain a package.json file.",
    );
  }

  return {
    projectRoot: getDirectoryName(packageJsonFile.path),
    packageJsonPath: packageJsonFile.path,
    packageJsonFile,
  };
}

function getFileAtPath(
  files: IndexedTemplateFile[],
  targetPath: string,
) {
  return files.find((file) => file.path === targetPath) ?? null;
}

function detectPackageManager(
  files: IndexedTemplateFile[],
  projectRoot: string,
  packageJsonFile: IndexedTemplateFile,
): SupportedPackageManager {
  let packageJson: {
    packageManager?: string;
  };

  try {
    packageJson = JSON.parse(packageJsonFile.file.content) as {
      packageManager?: string;
    };
  } catch {
    throw new Error(
      "Imported files are loaded, but preview is unavailable because package.json could not be parsed.",
    );
  }
  const packageManagerFromField = parsePackageManager(packageJson.packageManager);

  if (packageManagerFromField) {
    return packageManagerFromField;
  }

  const lockfileNames: Array<{
    filename: string;
    manager: SupportedPackageManager;
  }> = [
    { filename: "pnpm-lock.yaml", manager: "pnpm" },
    { filename: "yarn.lock", manager: "yarn" },
    { filename: "bun.lockb", manager: "bun" },
    { filename: "bun.lock", manager: "bun" },
    { filename: "package-lock.json", manager: "npm" },
  ];

  for (const lockfile of lockfileNames) {
    const lockfilePath = normalizePath([projectRoot, lockfile.filename]);
    if (getFileAtPath(files, lockfilePath)) {
      return lockfile.manager;
    }
  }

  return "npm";
}

function getRunScript(packageJsonFile: IndexedTemplateFile): SupportedRunScript {
  let packageJson: {
    scripts?: Partial<Record<SupportedRunScript, string>>;
  };

  try {
    packageJson = JSON.parse(packageJsonFile.file.content) as {
      scripts?: Partial<Record<SupportedRunScript, string>>;
    };
  } catch {
    throw new Error(
      "Imported files are loaded, but preview is unavailable because package.json could not be parsed.",
    );
  }
  const scripts = packageJson.scripts ?? {};

  if (scripts.dev) {
    return "dev";
  }

  if (scripts.start) {
    return "start";
  }

  if (scripts.preview) {
    return "preview";
  }

  throw new Error(
    "Imported files are loaded, but preview is unavailable because package.json does not define a dev, start, or preview script.",
  );
}

function createRunCommand(
  packageManager: SupportedPackageManager,
  runScript: SupportedRunScript,
): WebContainerCommand {
  switch (packageManager) {
    case "pnpm":
    case "yarn":
      return {
        command: packageManager,
        args: [runScript],
        label: `${packageManager} ${runScript}`,
      };
    case "bun":
      return {
        command: "bun",
        args: ["run", runScript],
        label: `bun run ${runScript}`,
      };
    case "npm":
    default:
      return {
        command: "npm",
        args: ["run", runScript],
        label: `npm run ${runScript}`,
      };
  }
}

function createInstallCommands(
  packageManager: SupportedPackageManager,
): WebContainerCommand[] {
  const npmFallbacks: WebContainerCommand[] = [
    {
      command: "npm",
      args: ["install", "--no-fund", "--no-audit"],
      label: "npm install --no-fund --no-audit",
    },
    {
      command: "npm",
      args: ["install", "--legacy-peer-deps", "--no-fund", "--no-audit"],
      label: "npm install --legacy-peer-deps --no-fund --no-audit",
    },
  ];

  switch (packageManager) {
    case "pnpm":
      return [
        {
          command: "pnpm",
          args: ["install", "--no-frozen-lockfile"],
          label: "pnpm install --no-frozen-lockfile",
        },
        ...npmFallbacks,
      ];
    case "yarn":
      return [
        {
          command: "yarn",
          args: ["install"],
          label: "yarn install",
        },
        ...npmFallbacks,
      ];
    case "bun":
      return [
        {
          command: "bun",
          args: ["install"],
          label: "bun install",
        },
        ...npmFallbacks,
      ];
    case "npm":
    default:
      return npmFallbacks;
  }
}

export function transformToWebContainerFormat(
  template: TemplateFolder,
): FileSystemTree {
  return template.items.reduce<FileSystemTree>((tree, item) => {
    tree[getItemName(item)] = toNode(item);
    return tree;
  }, {});
}

export function prepareWebContainerProject(
  template: TemplateFolder,
): PreparedWebContainerProject {
  const files = indexTemplateFiles(template);
  const { projectRoot, packageJsonPath, packageJsonFile } =
    getProjectRootFromFiles(files);
  const packageManager = detectPackageManager(files, projectRoot, packageJsonFile);
  const runScript = getRunScript(packageJsonFile);

  return {
    fileSystemTree: transformToWebContainerFormat(template),
    projectRoot,
    packageJsonPath,
    packageManager,
    installCommands: createInstallCommands(packageManager),
    runCommand: createRunCommand(packageManager, runScript),
    runScript,
  };
}
