"use client";

import { useCallback, useEffect, useState } from "react";
import { WebContainer } from "@webcontainer/api";

interface UseWebContainerReturn {
  isLoading: boolean;
  error: Error | null;
  instance: WebContainer | null;
  writeFile: (path: string, content: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  renameEntry: (previousPath: string, nextPath: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  destroy: () => void;
}

let globalInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

function getParentPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.slice(0, -1).join("/");
}

export function useWebContainer(): UseWebContainerReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(globalInstance);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        if (!window.crossOriginIsolated) {
          throw new Error(
            "WebContainer requires a cross-origin isolated page. Check the COOP and COEP headers for this route, ensure COEP is set to credentialless, and restart the Next.js dev server if you just changed them.",
          );
        }

        if (globalInstance) {
          if (!cancelled) {
            setInstance(globalInstance);
            setIsLoading(false);
          }
          return;
        }

        if (!bootPromise) {
          bootPromise = WebContainer.boot({
            coep: "credentialless",
            forwardPreviewErrors: "exceptions-only",
            workdirName: "playground",
          });
        }

        const nextInstance = await bootPromise;
        globalInstance = nextInstance;

        if (!cancelled) {
          setInstance(nextInstance);
          setIsLoading(false);
        }
      } catch (nextError) {
        bootPromise = null;

        if (!cancelled) {
          setError(nextError as Error);
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const writeFile = useCallback(
    async (path: string, content: string) => {
      if (!instance) {
        return;
      }

      const parentPath = getParentPath(path);
      if (parentPath) {
        await instance.fs.mkdir(parentPath, { recursive: true });
      }

      await instance.fs.writeFile(path, content);
    },
    [instance],
  );

  const createDirectory = useCallback(
    async (path: string) => {
      if (!instance || !path) {
        return;
      }

      await instance.fs.mkdir(path, { recursive: true });
    },
    [instance],
  );

  const renameEntry = useCallback(
    async (previousPath: string, nextPath: string) => {
      if (!instance || previousPath === nextPath) {
        return;
      }

      const parentPath = getParentPath(nextPath);
      if (parentPath) {
        await instance.fs.mkdir(parentPath, { recursive: true });
      }

      await instance.fs.rename(previousPath, nextPath);
    },
    [instance],
  );

  const deleteEntry = useCallback(
    async (path: string) => {
      if (!instance) {
        return;
      }

      await instance.fs.rm(path, { force: true, recursive: true });
    },
    [instance],
  );

  const destroy = useCallback(() => {
    if (!instance) {
      return;
    }

    instance.teardown();
    globalInstance = null;
    bootPromise = null;
    setInstance(null);
  }, [instance]);

  return {
    isLoading,
    error,
    instance,
    writeFile,
    createDirectory,
    renameEntry,
    deleteEntry,
    destroy,
  };
}
