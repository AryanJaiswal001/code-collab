"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { WebContainer } from "@webcontainer/api";
import { CheckCircle2, Loader2, TerminalSquare, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TemplateFolder } from "../../playground/types";
import { transformToWebContainerFormat } from "../hooks/transformer";
import type { TerminalRef } from "./terminal";

const TerminalComponent = dynamic(() => import("./terminal"), { ssr: false });

type WebContainerPreviewProps = {
  templateData: TemplateFolder;
  instance: WebContainer | null;
  isLoading: boolean;
  error: string | null;
};

const setupLabels = [
  "Mounting project files",
  "Installing dependencies",
  "Starting preview server",
] as const;

export default function WebContainerPreview({
  templateData,
  instance,
  isLoading,
  error,
}: WebContainerPreviewProps) {
  const terminalRef = useRef<TerminalRef | null>(null);
  const startedRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [setupStep, setSetupStep] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);

  const progressValue = useMemo(() => {
    if (!setupStep) {
      return 0;
    }

    return (setupStep / setupLabels.length) * 100;
  }, [setupStep]);

  useEffect(() => {
    if (!instance || startedRef.current) {
      return;
    }

    startedRef.current = true;
    const container = instance;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    async function bootPreview() {
      try {
        setSetupError(null);
        setSetupStep(1);
        terminalRef.current?.writeToTerminal("Mounting starter files...\r\n");

        await container.mount(transformToWebContainerFormat(templateData));

        setSetupStep(2);
        terminalRef.current?.writeToTerminal("Installing dependencies...\r\n");

        const installProcess = await container.spawn("npm", ["install"]);
        await installProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              terminalRef.current?.writeToTerminal(chunk);
            },
          }),
        );
        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error(
            `Dependency installation failed with exit code ${installExitCode}.`,
          );
        }

        setSetupStep(3);
        terminalRef.current?.writeToTerminal("Starting Vite dev server...\r\n");

        unsubscribe = container.on("server-ready", (_port, url) => {
          if (disposed) {
            return;
          }

          setPreviewUrl(url);
          terminalRef.current?.writeToTerminal(`Preview ready at ${url}\r\n`);
        });

        const devProcess = await container.spawn("npm", ["run", "dev"]);
        void devProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              terminalRef.current?.writeToTerminal(chunk);
            },
          }),
        );
      } catch (nextError) {
        if (disposed) {
          return;
        }

        const message =
          nextError instanceof Error
            ? nextError.message
            : "Failed to start the preview environment.";
        setSetupError(message);
        terminalRef.current?.writeToTerminal(`Error: ${message}\r\n`);
      }
    }

    void bootPreview();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [instance, templateData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#050816] text-white/75">
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-300" />
          <p className="text-sm">Booting WebContainer runtime...</p>
        </div>
      </div>
    );
  }

  if (error || setupError) {
    return (
      <div className="flex h-full items-center justify-center bg-[#050816] p-6 text-white">
        <div className="max-w-md rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <div className="mb-3 flex items-center gap-2 text-red-200">
            <XCircle className="h-5 w-5" />
            <p className="font-medium">Playground preview unavailable</p>
          </div>
          <p className="text-sm leading-6 text-red-100/85">
            {error ?? setupError}
          </p>
          <p className="mt-3 text-xs leading-5 text-red-100/65">
            If this is a WebContainer isolation issue, we can tune headers next.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#050816]">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Preview</p>
            <p className="text-xs text-white/45">
              Minimum stable playground runtime
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/45">
            <TerminalSquare className="h-3.5 w-3.5" />
            <span>{previewUrl ? "Live" : "Setting up"}</span>
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
                className="flex items-center gap-2 text-xs text-white/60"
              >
                {complete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-white/15" />
                )}
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-[7]">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title="Playground preview"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/45">
            Preview will appear here once the dev server is ready.
          </div>
        )}
      </div>

      <div className="min-h-0 flex-[3]">
        <TerminalComponent
          ref={terminalRef}
          webContainerInstance={instance}
          theme="dark"
          className="h-full border-0"
        />
      </div>
    </div>
  );
}
