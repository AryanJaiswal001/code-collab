"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import dynamic from "next/dynamic";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateFolder } from "../../playground/types";
import {
  prepareWebContainerProject,
  type PreparedWebContainerProject,
  type WebContainerCommand,
} from "../hooks/transformer";
import type { TerminalRef } from "./terminal";
import {
  appendWebContainerRuntimeOutput,
  getWebContainerRuntimeOutputBuffer,
  resetWebContainerRuntimeOutput,
} from "./runtime-output-buffer";

const TerminalComponent = dynamic(() => import("./terminal"), { ssr: false });

type WebContainerPreviewProps = {
  templateData: TemplateFolder;
  instance: WebContainer | null;
  isLoading: boolean;
  error: string | null;
  restartKey: number;
  onRestart: () => void;
  runtimeKey?: string;
  showTerminalPanel?: boolean;
  terminalRef?: RefObject<TerminalRef | null>;
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
  showTerminalPanel = true,
  terminalRef,
}: WebContainerPreviewProps) {
  const internalTerminalRef = useRef<TerminalRef | null>(null);
  const latestTemplateRef = useRef(templateData);
  const terminalControllerRef = terminalRef ?? internalTerminalRef;
  const [previewUrl, setPreviewUrl] = useState(runtimeSessionCache.previewUrl);
  const [isPreviewFrameLoaded, setIsPreviewFrameLoaded] = useState(false);
  const [setupStep, setSetupStep] = useState(runtimeSessionCache.setupStep);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [projectRoot, setProjectRoot] = useState(runtimeSessionCache.projectRoot);
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

  useEffect(() => {
    if (!previewUrl) {
      setIsPreviewFrameLoaded(false);
    }
  }, [previewUrl]);

  const writeToTerminal = useCallback((data: string) => {
    appendWebContainerRuntimeOutput(data);
    terminalControllerRef.current?.writeToTerminal(data);
  }, [terminalControllerRef]);

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
          setActiveCommandLabel(runtimeSessionCache.runLabel);
          setSetupStep(Math.max(runtimeSessionCache.setupStep, 1));
          setPreviewUrl(runtimeSessionCache.previewUrl);
          setIsPreviewFrameLoaded(false);
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
          resetWebContainerRuntimeOutput();
          terminalControllerRef.current?.clearTerminal();
        }

        clearRuntimeSessionCache();
        runtimeSessionCache.container = container;
        runtimeSessionCache.runtimeKey = runtimeKey;
        runtimeSessionCache.status = restartKey ? "restarting" : "setting_up";
        appendWebContainerRuntimeOutput(
          restartKey
            ? "\r\n=== Restarting WebContainer runtime ===\r\n"
            : "\r\n=== Booting WebContainer runtime ===\r\n",
        );
        terminalControllerRef.current?.writeToTerminal(
          restartKey
            ? "\r\n=== Restarting WebContainer runtime ===\r\n"
            : "\r\n=== Booting WebContainer runtime ===\r\n",
        );

        setPreviewUrl("");
        setIsPreviewFrameLoaded(false);
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
              setIsPreviewFrameLoaded(false);
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
  }, [instance, restartKey, runtimeKey, terminalControllerRef, writeToTerminal]);

  const effectiveStatus: RuntimeStatus = error || setupError
    ? "error"
    : previewUrl
      ? "live"
      : runtimeStatus;
  const activeSetupLabel =
    setupLabels[Math.max(0, Math.min(setupStep - 1, setupLabels.length - 1))] ??
    "Preparing runtime";
  const shouldShowPreviewOverlay =
    effectiveStatus !== "live" || !isPreviewFrameLoaded;

  const statusMeta = {
    idle: {
      label: "Idle",
      className: "bg-white/5 text-white/55",
      icon: null,
    },
    setting_up: {
      label: "Setting up",
      className: "bg-sky-400/10 text-sky-200",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    restarting: {
      label: "Setting up",
      className: "bg-amber-300/10 text-amber-200",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    live: {
      label: "Live",
      className: "bg-emerald-400/10 text-emerald-200",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    error: {
      label: "Error",
      className: "bg-red-400/10 text-red-200",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  } satisfies Record<
    RuntimeStatus,
    { label: string; className: string; icon: React.ReactNode }
  >;

  const overlayStatusText =
    effectiveStatus === "error"
      ? "Preview failed to start"
      : previewUrl && !isPreviewFrameLoaded
        ? "Loading preview..."
        : isLoading
          ? "Booting WebContainer runtime..."
          : `${activeSetupLabel}...`;
  const overlayDetailText =
    effectiveStatus === "error"
      ? error ?? setupError ?? "The preview environment could not be started."
      : previewUrl && !isPreviewFrameLoaded
        ? "The development server is ready. Finalizing the preview frame now."
        : activeCommandLabel
          ? `Running ${activeCommandLabel}`
          : projectRoot
            ? `Working in ${projectRoot}`
            : "Preparing the project files and runtime environment.";
  const previewSurface = (
    <div className="h-full bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_35%)] p-3">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white shadow-[0_20px_60px_rgba(5,8,22,0.45)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="max-w-[70%] truncate rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
            {previewUrl || (effectiveStatus === "error" ? "Preview unavailable" : "Preparing preview")}
          </span>
        </div>

        <div className="relative min-h-0 flex-1 bg-[#f8fafc]">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="WebContainer preview"
              className={cn(
                "h-full w-full border-0 bg-white transition-opacity duration-300",
                isPreviewFrameLoaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => {
                setIsPreviewFrameLoaded(true);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_35%)] text-sm text-slate-400">
              Preview output will appear here.
            </div>
          )}

          <div
            aria-hidden={!shouldShowPreviewOverlay}
            className={cn(
              "absolute inset-0 z-10 flex items-center justify-center bg-[#040714]/70 p-6 backdrop-blur-md transition-all duration-300",
              shouldShowPreviewOverlay
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0",
            )}
          >
            <div className="w-full max-w-md rounded-[28px] border border-white/12 bg-slate-950/78 p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
              {effectiveStatus === "error" ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-red-200">
                      <XCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {overlayStatusText}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/70">
                        {overlayDetailText}
                      </p>
                    </div>
                  </div>

                  {!isCrossOriginIsolated ? (
                    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100/85">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        This page is not cross-origin isolated yet. Restart the
                        Next.js dev server after setting COOP and COEP headers.
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                      onClick={() => {
                        terminalControllerRef.current?.focusTerminal();
                      }}
                    >
                      View Logs
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-3 text-emerald-200">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {overlayStatusText}
                      </p>
                      <p className="mt-1 text-sm text-white/65">
                        {overlayDetailText}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {setupLabels.map((label, index) => {
                      const stepNumber = index + 1;
                      const complete = stepNumber < setupStep || Boolean(previewUrl);
                      const active =
                        !previewUrl && stepNumber === Math.max(setupStep, 1);

                      return (
                        <div
                          key={label}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs transition-colors",
                            complete
                              ? "border-emerald-300/15 bg-emerald-300/10 text-emerald-100"
                              : active
                                ? "border-sky-300/15 bg-sky-300/10 text-sky-100"
                                : "border-white/10 bg-white/[0.03] text-white/45",
                          )}
                        >
                          {complete ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          ) : active ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          ) : (
                            <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current/40" />
                          )}
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#050816]">
      <div className="flex-shrink-0 border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Preview</p>
            <p className="text-xs text-white/40">Live app output</p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${statusMeta[effectiveStatus].className}`}
            >
              {statusMeta[effectiveStatus].icon}
              <span>{statusMeta[effectiveStatus].label}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl border border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500"
              onClick={onRestart}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Restart
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {showTerminalPanel ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">{previewSurface}</div>
            <div className="h-64 min-h-[13rem] flex-shrink-0 overflow-hidden border-t border-white/10">
              <TerminalComponent
                ref={terminalControllerRef}
                webContainerInstance={instance}
                theme="dark"
                className="h-full border-0"
                initialOutput={getWebContainerRuntimeOutputBuffer()}
                onClear={() => {
                  resetWebContainerRuntimeOutput();
                }}
              />
            </div>
          </div>
        ) : (
          previewSurface
        )}
      </div>
    </div>
  );
}
