import { useState, useEffect, useCallback, useRef } from "react";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

let globalInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export const useWebContainer = ({
  templateData,
}: UseWebContainerProps): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(globalInstance);

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        if (globalInstance) {
          if (mounted) {
            setInstance(globalInstance);
            setIsLoading(false);
          }
          return;
        }
        if (!bootPromise) {
          bootPromise = WebContainer.boot();
        }
        const webcontainerInstance = await bootPromise;
        globalInstance = webcontainerInstance;
        if (!mounted) return;
        setInstance(webcontainerInstance);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initailize Web Container", err);
        bootPromise = null;
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    }
    initializeWebContainer();
    return () => {
      mounted = false;
    };
  }, []);

  const writeFileSync = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!instance) {
        throw new Error("WebContainer instance is not initialized");
      }
      try {
        const pathParts = path.split("/");
        const folderPath = pathParts.slice(0, -1).join("/");
        if (folderPath) {
          await instance.fs.mkdir(folderPath, { recursive: true });
        }
        await instance.fs.writeFile(path, content);
      } catch (err) {
        console.error(`Failed to write file at path: ${path}`, err);
        throw err;
      }
    },
    [instance],
  );
  const destroy = useCallback(() => {
    if (instance) {
      instance.teardown();
      globalInstance = null;
      bootPromise = null;
      setInstance(null);
      setServerUrl(null);
    }
  }, [instance]);
  return {
    serverUrl,
    isLoading,
    error,
    instance,
    writeFileSync,
    destroy,
  };
};
