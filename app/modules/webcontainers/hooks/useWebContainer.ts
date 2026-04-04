"use client";

import { useCallback, useEffect, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import type { TemplateFolder } from "../../playground/types";

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContainerReturn {
  isLoading: boolean;
  error: Error | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

let globalInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function useWebContainer({
  templateData,
}: UseWebContainerProps): UseWebContainerReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(globalInstance);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        if (globalInstance) {
          if (!cancelled) {
            setInstance(globalInstance);
            setIsLoading(false);
          }
          return;
        }

        if (!bootPromise) {
          bootPromise = WebContainer.boot();
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
  }, [templateData.folderName]);

  const writeFileSync = useCallback(
    async (path: string, content: string) => {
      if (!instance) {
        return;
      }

      const segments = path.split("/").filter(Boolean);
      const folderPath = segments.slice(0, -1).join("/");

      if (folderPath) {
        await instance.fs.mkdir(folderPath, { recursive: true });
      }

      await instance.fs.writeFile(path, content);
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
    writeFileSync,
    destroy,
  };
}
