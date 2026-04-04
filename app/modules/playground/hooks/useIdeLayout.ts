"use client";

import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type IdeLayoutStorageState = {
  explorerOpen?: boolean;
  previewOpen?: boolean;
  terminalOpen?: boolean;
  collaborationOpen?: boolean;
  explorerWidth?: number;
  rightRailWidth?: number;
  terminalHeight?: number;
};

type UseIdeLayoutOptions = {
  storageKey: string;
  enableCollaboration?: boolean;
  defaultExplorerOpen?: boolean;
  defaultPreviewOpen?: boolean;
  defaultTerminalOpen?: boolean;
  defaultCollaborationOpen?: boolean;
  defaultExplorerWidth?: number;
  defaultRightRailWidth?: number;
  defaultTerminalHeight?: number;
  rightRailMinWidth?: number;
  rightRailMaxWidth?: number;
};

const EXPLORER_MIN_WIDTH = 220;
const EXPLORER_MAX_WIDTH = 360;
const RIGHT_RAIL_MIN_WIDTH = 280;
const RIGHT_RAIL_MAX_WIDTH = 420;
const TERMINAL_MIN_HEIGHT = 160;
const TERMINAL_MAX_HEIGHT = 360;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => {
      setMatches(mediaQuery.matches);
    };

    updateMatches();
    mediaQuery.addEventListener("change", updateMatches);

    return () => {
      mediaQuery.removeEventListener("change", updateMatches);
    };
  }, [query]);

  return matches;
}

export function useIdeLayout({
  storageKey,
  enableCollaboration = false,
  defaultExplorerOpen = true,
  defaultPreviewOpen = true,
  defaultTerminalOpen = false,
  defaultCollaborationOpen = false,
  defaultExplorerWidth = 240,
  defaultRightRailWidth = 320,
  defaultTerminalHeight = 208,
  rightRailMinWidth = RIGHT_RAIL_MIN_WIDTH,
  rightRailMaxWidth = RIGHT_RAIL_MAX_WIDTH,
}: UseIdeLayoutOptions) {
  const isMobile = useIsMobile();
  const isTablet = useMediaQuery("(max-width: 1023px)");
  const [isHydrated, setIsHydrated] = useState(false);
  const [explorerSheetOpen, setExplorerSheetOpen] = useState(false);
  const [rightRailSheetOpen, setRightRailSheetOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(defaultExplorerOpen);
  const [previewOpen, setPreviewOpen] = useState(defaultPreviewOpen);
  const [terminalOpen, setTerminalOpen] = useState(defaultTerminalOpen);
  const [collaborationOpen, setCollaborationOpen] = useState(defaultCollaborationOpen);
  const [explorerWidth, setExplorerWidthState] = useState(
    clamp(defaultExplorerWidth, EXPLORER_MIN_WIDTH, EXPLORER_MAX_WIDTH),
  );
  const [rightRailWidth, setRightRailWidthState] = useState(
    clamp(defaultRightRailWidth, rightRailMinWidth, rightRailMaxWidth),
  );
  const [terminalHeight, setTerminalHeightState] = useState(
    clamp(defaultTerminalHeight, TERMINAL_MIN_HEIGHT, TERMINAL_MAX_HEIGHT),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedLayout = window.sessionStorage.getItem(storageKey);

      if (!storedLayout) {
        setIsHydrated(true);
        return;
      }

      const parsedLayout = JSON.parse(storedLayout) as IdeLayoutStorageState;

      setExplorerOpen(parsedLayout.explorerOpen ?? defaultExplorerOpen);
      setPreviewOpen(parsedLayout.previewOpen ?? defaultPreviewOpen);
      setTerminalOpen(parsedLayout.terminalOpen ?? defaultTerminalOpen);
      setCollaborationOpen(
        enableCollaboration
          ? parsedLayout.collaborationOpen ?? defaultCollaborationOpen
          : false,
      );
      setExplorerWidthState(
        clamp(
          parsedLayout.explorerWidth ?? defaultExplorerWidth,
          EXPLORER_MIN_WIDTH,
          EXPLORER_MAX_WIDTH,
        ),
      );
      setRightRailWidthState(
        clamp(
          parsedLayout.rightRailWidth ?? defaultRightRailWidth,
          rightRailMinWidth,
          rightRailMaxWidth,
        ),
      );
      setTerminalHeightState(
        clamp(
          parsedLayout.terminalHeight ?? defaultTerminalHeight,
          TERMINAL_MIN_HEIGHT,
          TERMINAL_MAX_HEIGHT,
        ),
      );
    } catch {
      setExplorerOpen(defaultExplorerOpen);
      setPreviewOpen(defaultPreviewOpen);
      setTerminalOpen(defaultTerminalOpen);
      setCollaborationOpen(enableCollaboration ? defaultCollaborationOpen : false);
      setExplorerWidthState(
        clamp(defaultExplorerWidth, EXPLORER_MIN_WIDTH, EXPLORER_MAX_WIDTH),
      );
      setRightRailWidthState(
        clamp(defaultRightRailWidth, rightRailMinWidth, rightRailMaxWidth),
      );
      setTerminalHeightState(
        clamp(defaultTerminalHeight, TERMINAL_MIN_HEIGHT, TERMINAL_MAX_HEIGHT),
      );
    } finally {
      setIsHydrated(true);
    }
  }, [
    defaultCollaborationOpen,
    defaultExplorerOpen,
    defaultExplorerWidth,
    defaultPreviewOpen,
    defaultRightRailWidth,
    defaultTerminalHeight,
    defaultTerminalOpen,
    enableCollaboration,
    rightRailMaxWidth,
    rightRailMinWidth,
    storageKey,
  ]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    const nextLayout: IdeLayoutStorageState = {
      explorerOpen,
      previewOpen,
      terminalOpen,
      collaborationOpen: enableCollaboration ? collaborationOpen : false,
      explorerWidth,
      rightRailWidth,
      terminalHeight,
    };

    window.sessionStorage.setItem(storageKey, JSON.stringify(nextLayout));
  }, [
    collaborationOpen,
    enableCollaboration,
    explorerOpen,
    explorerWidth,
    isHydrated,
    previewOpen,
    rightRailWidth,
    storageKey,
    terminalHeight,
    terminalOpen,
  ]);

  const isCompactViewport = isTablet;
  const isRightRailVisible = previewOpen || terminalOpen || collaborationOpen;

  const openExplorer = () => {
    if (isCompactViewport) {
      setExplorerSheetOpen(true);
      return;
    }

    setExplorerOpen(true);
  };

  const toggleExplorer = () => {
    if (isCompactViewport) {
      setExplorerSheetOpen((currentValue) => !currentValue);
      return;
    }

    setExplorerOpen((currentValue) => !currentValue);
  };

  const togglePreview = () => {
    setPreviewOpen((currentValue) => {
      const nextValue = !currentValue;

      if (isCompactViewport) {
        setRightRailSheetOpen(nextValue || terminalOpen || collaborationOpen);
      }

      return nextValue;
    });
  };

  const toggleTerminal = () => {
    setTerminalOpen((currentValue) => {
      const nextValue = !currentValue;

      if (isCompactViewport) {
        setRightRailSheetOpen(previewOpen || nextValue || collaborationOpen);
      }

      return nextValue;
    });
  };

  const toggleCollaboration = () => {
    if (!enableCollaboration) {
      return;
    }

    setCollaborationOpen((currentValue) => {
      const nextValue = !currentValue;

      if (isCompactViewport) {
        setRightRailSheetOpen(previewOpen || terminalOpen || nextValue);
      }

      return nextValue;
    });
  };

  const setExplorerWidth = (nextWidth: number) => {
    setExplorerWidthState(clamp(nextWidth, EXPLORER_MIN_WIDTH, EXPLORER_MAX_WIDTH));
  };

  const setRightRailWidth = (nextWidth: number) => {
    setRightRailWidthState(clamp(nextWidth, rightRailMinWidth, rightRailMaxWidth));
  };

  const setTerminalHeight = (nextHeight: number) => {
    setTerminalHeightState(clamp(nextHeight, TERMINAL_MIN_HEIGHT, TERMINAL_MAX_HEIGHT));
  };

  const desktopGridTemplateColumns = useMemo(() => {
    const leftColumn = explorerOpen ? `${explorerWidth}px` : "0px";
    const leftHandle = explorerOpen ? "10px" : "0px";
    const rightHandle = isRightRailVisible ? "10px" : "0px";
    const rightColumn = isRightRailVisible ? `${rightRailWidth}px` : "0px";

    return `${leftColumn} ${leftHandle} minmax(0, 1fr) ${rightHandle} ${rightColumn}`;
  }, [explorerOpen, explorerWidth, isRightRailVisible, rightRailWidth]);

  return {
    collaborationOpen,
    desktopGridTemplateColumns,
    explorerOpen,
    explorerSheetOpen,
    explorerWidth,
    isCompactViewport,
    isMobile,
    isRightRailVisible,
    isTablet,
    openExplorer,
    previewOpen,
    rightRailSheetOpen,
    rightRailWidth,
    setCollaborationOpen,
    setExplorerOpen,
    setExplorerSheetOpen,
    setExplorerWidth,
    setPreviewOpen,
    setRightRailSheetOpen,
    setRightRailWidth,
    setTerminalHeight,
    setTerminalOpen,
    terminalHeight,
    terminalOpen,
    toggleCollaboration,
    toggleExplorer,
    togglePreview,
    toggleTerminal,
  };
}
