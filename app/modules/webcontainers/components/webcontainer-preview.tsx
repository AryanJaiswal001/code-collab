"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { TemplateFolder } from "../../playground/types";
import {
  prepareWebContainerProject,
  type PreparedWebContainerProject,
  type WebContainerCommand,
} from "../hooks/transformer";
import type { TerminalRef } from "./terminal";

const TerminalComponent = dynamic(() => import("./terminal"), { ssr: false });

type WebContainerPreviewProps = {
  templateData: TemplateFolder;
  instance: WebContainer | null;
  isLoading: boolean;
  error: string | null;
  restartKey: number;
  onRestart: () => void;
  runtimeKey?: string;
};

const setupLabels = [
  "Transforming template data",
  "Mounting files",
  "Installing dependencies",
  "Starting development server",
] as const;

type RuntimeStatus = "idle" | "setting_up" | "restarting" | "live" | "error";

type RuntimeSessionCache = {
  container: WebContainer | null;
  runtimeKey: string | null;
  mounted: boolean;
  previewUrl: string;
  projectRoot: string;
  packageManager: string;
  runLabel: string;
  setupStep: number;
  outputBuffer: string;
  serverProcess: WebContainerProcess | null;
  serverReadyUnsubscribe: (() => void) | null;
  status: RuntimeStatus;
};

const runtimeSessionCache: RuntimeSessionCache = {
  container: null,
  runtimeKey: null,
  mounted: false,
  previewUrl: "",
  projectRoot: "",
  packageManager: "",
  runLabel: "",
  setupStep: 0,
  outputBuffer: "",
  serverProcess: null,
  serverReadyUnsubscribe: null,
  status: "idle",
};

function getSpawnOptions(projectRoot: string) {
  return projectRoot ? { cwd: projectRoot } : undefined;
}

function clearRuntimeSessionCache() {
  runtimeSessionCache.serverReadyUnsubscribe?.();
  runtimeSessionCache.serverReadyUnsubscribe = null;
  runtimeSessionCache.serverProcess?.kill();
  runtimeSessionCache.serverProcess = null;
  runtimeSessionCache.previewUrl = "";
  runtimeSessionCache.mounted = false;
  runtimeSessionCache.projectRoot = "";
  runtimeSessionCache.packageManager = "";
  runtimeSessionCache.runLabel = "";
  runtimeSessionCache.setupStep = 0;
  runtimeSessionCache.status = "idle";
}

async function runCommandSequence(
  container: WebContainer,
  commands: WebContainerCommand[],
  projectRoot: string,
  writeToTerminal: (chunk: string) => void,
) {
  const failures: string[] = [];

  for (const [index, command] of commands.entries()) {
    writeToTerminal(`\r\n$ ${command.label}\r\n`);

    try {
      const process = await container.spawn(
        command.command,
        command.args,
        getSpawnOptions(projectRoot),
      );

      await process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            writeToTerminal(chunk);
          },
        }),
      );

      const exitCode = await process.exit;
      if (exitCode === 0) {
        return command;
      }

      failures.push(`${command.label} exited with code ${exitCode}`);
      writeToTerminal(
        `\r\n${command.label} exited with code ${exitCode}.\r\n`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to run ${command.label}.`;
      failures.push(message);
      writeToTerminal(`\r\n${message}\r\n`);
    }

    if (index < commands.length - 1) {
      writeToTerminal("\r\nTrying fallback install command...\r\n");
    }
  }

  throw new Error(failures.join(" "));
}

export default function WebContainerPreview({
  templateData,
  instance,
  isLoading,
  error,
  restartKey,
  onRestart,
  runtimeKey = templateData.folderName,
}: WebContainerPreviewProps) {
  const terminalRef = useRef<TerminalRef | null>(null);
  const latestTemplateRef = useRef(templateData);
  const [previewUrl, setPreviewUrl] = useState(runtimeSessionCache.previewUrl);
  const [setupStep, setSetupStep] = useState(runtimeSessionCache.setupStep);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [projectRoot, setProjectRoot] = useState(runtimeSessionCache.projectRoot);
  const [packageManager, setPackageManager] = useState(runtimeSessionCache.packageManager);
  const [activeCommandLabel, setActiveCommandLabel] = useState(
    runtimeSessionCache.runLabel,
  );
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(
    runtimeSessionCache.status,
  );
  const isCrossOriginIsolated =
    typeof window !== "undefined" && window.crossOriginIsolated;

  useEffect(() => {
    latestTemplateRef.current = templateData;
  }, [templateData]);

  const writeToTerminal = useCallback((data: string) => {
    runtimeSessionCache.outputBuffer += data;
    terminalRef.current?.writeToTerminal(data);
  }, []);

  const progressValue = useMemo(() => {
    if (!setupStep) {
      return 0;
    }

    return (setupStep / setupLabels.length) * 100;
  }, [setupStep]);

  useEffect(() => {
    if (!instance) {
      return;
    }

    const container = instance;
    let cancelled = false;

    async function bootPreview() {
      try {
        setSetupError(null);

        if (
          restartKey === 0 &&
          runtimeSessionCache.container === container &&
          runtimeSessionCache.runtimeKey === runtimeKey &&
          runtimeSessionCache.mounted &&
          runtimeSessionCache.status !== "error"
        ) {
          setProjectRoot(runtimeSessionCache.projectRoot);
          setPackageManager(runtimeSessionCache.packageManager);
          setActiveCommandLabel(runtimeSessionCache.runLabel);
          setSetupStep(Math.max(runtimeSessionCache.setupStep, 1));
          setPreviewUrl(runtimeSessionCache.previewUrl);
          setRuntimeStatus(
            runtimeSessionCache.status === "idle"
              ? "setting_up"
              : runtimeSessionCache.status,
          );
          writeToTerminal(
            "\r\nReconnected to the existing WebContainer session.\r\n",
          );
          return;
        }

        if (runtimeSessionCache.runtimeKey && runtimeSessionCache.runtimeKey !== runtimeKey) {
          runtimeSessionCache.outputBuffer = "";
          terminalRef.current?.clearTerminal();
        }

        clearRuntimeSessionCache();
        runtimeSessionCache.container = container;
        runtimeSessionCache.runtimeKey = runtimeKey;
        runtimeSessionCache.status = restartKey ? "restarting" : "setting_up";
        runtimeSessionCache.outputBuffer += restartKey
          ? "\r\n=== Restarting WebContainer runtime ===\r\n"
          : "\r\n=== Booting WebContainer runtime ===\r\n";
        terminalRef.current?.writeToTerminal(
          restartKey
            ? "\r\n=== Restarting WebContainer runtime ===\r\n"
            : "\r\n=== Booting WebContainer runtime ===\r\n",
        );

        setPreviewUrl("");
        setSetupStep(1);
        setRuntimeStatus(runtimeSessionCache.status);
        runtimeSessionCache.setupStep = 1;
        writeToTerminal("Transforming template data...\r\n");

        const preparedProject: PreparedWebContainerProject =
          prepareWebContainerProject(latestTemplateRef.current);

        if (cancelled) {
          return;
        }

        setProjectRoot(preparedProject.projectRoot || "/");
        setPackageManager(preparedProject.packageManager);
        setActiveCommandLabel(preparedProject.runCommand.label);
        runtimeSessionCache.projectRoot = preparedProject.projectRoot || "/";
        runtimeSessionCache.packageManager = preparedProject.packageManager;
        runtimeSessionCache.runLabel = preparedProject.runCommand.label;

        writeToTerminal(
          `Detected project root: ${preparedProject.projectRoot || "."}\r\n`,
        );
        writeToTerminal(
          `Detected package manager: ${preparedProject.packageManager}\r\n`,
        );

        setSetupStep(2);
        runtimeSessionCache.setupStep = 2;
        writeToTerminal("Mounting project files...\r\n");
        await container.mount(preparedProject.fileSystemTree);
        runtimeSessionCache.mounted = true;

        if (cancelled) {
          return;
        }

        setSetupStep(3);
        runtimeSessionCache.setupStep = 3;
        writeToTerminal("Installing dependencies...\r\n");
        await runCommandSequence(
          container,
          preparedProject.installCommands,
          preparedProject.projectRoot,
          writeToTerminal,
        );

        if (cancelled) {
          return;
        }

        setSetupStep(4);
        runtimeSessionCache.setupStep = 4;
        writeToTerminal(
          `Starting development server with ${preparedProject.runCommand.label}...\r\n`,
        );

        runtimeSessionCache.serverReadyUnsubscribe = container.on(
          "server-ready",
          (_port, url) => {
            runtimeSessionCache.previewUrl = url;
            runtimeSessionCache.status = "live";
            if (!cancelled) {
              setPreviewUrl(url);
              setRuntimeStatus("live");
              writeToTerminal(`Preview ready at ${url}\r\n`);
            }
          },
        );

        const serverProcess = await container.spawn(
          preparedProject.runCommand.command,
          preparedProject.runCommand.args,
          getSpawnOptions(preparedProject.projectRoot),
        );
        runtimeSessionCache.serverProcess = serverProcess;

        void serverProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              writeToTerminal(chunk);
            },
          }),
        );

        const exitCode = await serverProcess.exit;
        if (!cancelled && exitCode !== 0) {
          throw new Error(
            `${preparedProject.runCommand.label} exited unexpectedly with code ${exitCode}.`,
          );
        }
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        const message =
          nextError instanceof Error
            ? nextError.message
            : "Failed to start the preview environment.";
        runtimeSessionCache.status = "error";
        setRuntimeStatus("error");
        setSetupError(message);
        writeToTerminal(`Error: ${message}\r\n`);
      }
    }

    void bootPreview();

    return () => {
      cancelled = true;
    };
  }, [instance, restartKey, runtimeKey, writeToTerminal]);

  const effectiveStatus: RuntimeStatus = error || setupError
    ? "error"
    : previewUrl
      ? "live"
      : runtimeStatus;

  const statusMeta = {
    idle: {
      label: "Idle",
      className: "bg-white/5 text-white/55",
    },
    setting_up: {
      label: "Setting up",
      className: "bg-sky-400/10 text-sky-200",
    },
    restarting: {
      label: "Restarting",
      className: "bg-amber-300/10 text-amber-200",
    },
    live: {
      label: "Live",
      className: "bg-emerald-400/10 text-emerald-200",
    },
    error: {
      label: "Error",
      className: "bg-red-400/10 text-red-200",
    },
  } satisfies Record<RuntimeStatus, { label: string; className: string }>;

  const previewSurface = isLoading ? (
    <div className="flex h-full items-center justify-center bg-[#050816] text-white/75">
      <div className="space-y-3 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-300" />
        <p className="text-sm">Booting WebContainer runtime...</p>
      </div>
    </div>
  ) : error || setupError ? (
    <div className="flex h-full items-center justify-center bg-[#050816] p-6 text-white">
      <div className="max-w-md rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
        <div className="mb-3 flex items-center gap-2 text-red-200">
          <XCircle className="h-5 w-5" />
          <p className="font-medium">WebContainer preview unavailable</p>
        </div>
        <p className="text-sm leading-6 text-red-100/85">
          {error ?? setupError}
        </p>
        {!isCrossOriginIsolated ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100/80">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This page is not cross-origin isolated yet. WebContainer needs
              COOP and COEP headers before SharedArrayBuffer can work. Restart
              the Next.js dev server after changing these headers.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  ) : previewUrl ? (
    <div className="h-full bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_35%)] p-3">
      <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white shadow-[0_20px_60px_rgba(5,8,22,0.45)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="max-w-[70%] truncate rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
            {previewUrl}
          </span>
        </div>
        <iframe
          src={previewUrl}
          title="WebContainer preview"
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </div>
  ) : (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_35%)] p-6 text-sm text-white/45">
      <div className="max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm font-medium text-white">
          {effectiveStatus === "restarting" ? "Restarting preview" : "Preparing preview"}
        </p>
        <p className="mt-2 leading-6 text-white/50">
          The preview will appear here as soon as the development server is ready.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#050816]">
      <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Preview</p>
            <p className="text-xs text-white/45">
              {activeCommandLabel || "Preparing runtime"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${statusMeta[effectiveStatus].className}`}
            >
              <TerminalSquare className="h-3.5 w-3.5" />
              <span>{statusMeta[effectiveStatus].label}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
              onClick={onRestart}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Restart
            </Button>
          </div>
        </div>

        <Progress value={progressValue} className="h-1.5 bg-white/10" />

        <div className="mt-3 grid gap-2">
          {setupLabels.map((label, index) => {
            const stepNumber = index + 1;
            const complete = stepNumber < setupStep || Boolean(previewUrl);
            const active = stepNumber === setupStep && !previewUrl;

            return (
              <div
                key={label}
                className="flex items-center justify-between gap-3 text-xs text-white/60"
              >
                <div className="flex items-center gap-2">
                  {complete ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  ) : active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border border-white/15" />
                  )}
                  <span>{label}</span>
                </div>

                {label === "Installing dependencies" && packageManager ? (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/45">
                    {packageManager}
                  </span>
                ) : null}
                {label === "Starting development server" && projectRoot ? (
                  <span className="truncate text-[11px] text-white/35">
                    {projectRoot}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="vertical" className="h-full">
          <ResizablePanel defaultSize={66} minSize={34}>
            {previewSurface}
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-white/10" />

          <ResizablePanel defaultSize={34} minSize={22}>
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full border-0"
              initialOutput={runtimeSessionCache.outputBuffer}
              onClear={() => {
                runtimeSessionCache.outputBuffer = "";
              }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
