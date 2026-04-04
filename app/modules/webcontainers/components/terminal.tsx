"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { SearchAddon } from "xterm-addon-search";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import { Copy, Download, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TerminalProps = {
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: WebContainer | null;
  initialOutput?: string;
  onClear?: () => void;
};

export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
  getLog: () => string;
  downloadLog: () => void;
}

const terminalThemes = {
  dark: {
    background: "#050816",
    foreground: "#e2e8f0",
    cursor: "#f8fafc",
    cursorAccent: "#050816",
    selection: "#1e293b",
    black: "#020617",
    red: "#f87171",
    green: "#4ade80",
    yellow: "#facc15",
    blue: "#60a5fa",
    magenta: "#c084fc",
    cyan: "#22d3ee",
    white: "#f8fafc",
    brightBlack: "#334155",
    brightRed: "#fca5a5",
    brightGreen: "#86efac",
    brightYellow: "#fde047",
    brightBlue: "#93c5fd",
    brightMagenta: "#d8b4fe",
    brightCyan: "#67e8f9",
    brightWhite: "#ffffff",
  },
  light: {
    background: "#ffffff",
    foreground: "#0f172a",
    cursor: "#0f172a",
    cursorAccent: "#ffffff",
    selection: "#cbd5e1",
    black: "#0f172a",
    red: "#dc2626",
    green: "#16a34a",
    yellow: "#ca8a04",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#f8fafc",
    brightBlack: "#475569",
    brightRed: "#ef4444",
    brightGreen: "#22c55e",
    brightYellow: "#eab308",
    brightBlue: "#3b82f6",
    brightMagenta: "#a855f7",
    brightCyan: "#06b6d4",
    brightWhite: "#ffffff",
  },
} as const;

const terminalBanner = "Code Collab runtime terminal\r\n\r\n";

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(
  ({ className, theme = "dark", webContainerInstance, initialOutput = "", onClear }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const searchRef = useRef<SearchAddon | null>(null);
    const logBufferRef = useRef(`${terminalBanner}${initialOutput}`);
    const [connected, setConnected] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const downloadLog = useCallback(() => {
      const blob = new Blob([logBufferRef.current], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "webcontainer-terminal.log";
      anchor.click();
      URL.revokeObjectURL(url);
    }, []);

    const writeToTerminal = useCallback((data: string) => {
      logBufferRef.current += data;
      termRef.current?.write(data);
    }, []);

    const clearTerminal = useCallback(() => {
      logBufferRef.current = terminalBanner;

      if (termRef.current) {
        termRef.current.reset();
        termRef.current.write(logBufferRef.current);
      }

      onClear?.();
    }, [onClear]);

    useImperativeHandle(
      ref,
      () => ({
        writeToTerminal,
        clearTerminal,
        focusTerminal: () => {
          termRef.current?.focus();
        },
        getLog: () => logBufferRef.current,
        downloadLog,
      }),
      [clearTerminal, downloadLog, writeToTerminal],
    );

    useEffect(() => {
      if (!hostRef.current || termRef.current) {
        return;
      }

      const terminal = new Terminal({
        allowTransparency: true,
        convertEol: true,
        cursorBlink: false,
        disableStdin: true,
        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        scrollback: 5000,
        theme: terminalThemes[theme],
      });
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddon);
      terminal.open(hostRef.current);
      terminal.write(logBufferRef.current);
      fitAddon.fit();

      termRef.current = terminal;
      fitRef.current = fitAddon;
      searchRef.current = searchAddon;

      const resizeObserver = new ResizeObserver(() => {
        fitRef.current?.fit();
      });
      resizeObserver.observe(hostRef.current);

      return () => {
        resizeObserver.disconnect();
        terminal.dispose();
        termRef.current = null;
        fitRef.current = null;
        searchRef.current = null;
      };
    }, [theme]);

    useEffect(() => {
      setConnected(Boolean(webContainerInstance));
    }, [webContainerInstance]);

    const copyLog = useCallback(async () => {
      const selectedText = termRef.current?.getSelection() ?? "";
      const textToCopy = selectedText || logBufferRef.current;

      if (!textToCopy) {
        return;
      }

      await navigator.clipboard.writeText(textToCopy);
    }, []);

    const searchInTerminal = useCallback((value: string) => {
      if (!value) {
        return;
      }

      searchRef.current?.findNext(value);
    }, []);

    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden border-t border-white/10 bg-[#040714]",
          className,
        )}
      >
        <div className="flex flex-shrink-0 flex-col gap-3 border-b border-white/10 bg-white/[0.02] px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/85">Terminal</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  connected
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-white/5 text-white/45",
                )}
              >
                {connected ? "Connected" : "Waiting"}
              </span>
            </div>
            <span
              className="mt-1 block text-[11px] text-white/40"
            >
              Setup output and runtime logs stay available here during preview changes.
            </span>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            {showSearch ? (
              <Input
                value={searchTerm}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchTerm(nextValue);
                  searchInTerminal(nextValue);
                }}
                placeholder="Search"
                className="h-7 w-32 rounded-lg border-white/10 bg-white/5 text-xs text-white"
              />
            ) : null}

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setShowSearch((value) => !value)}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="sr-only">Search terminal</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => void copyLog()}
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="sr-only">Copy log</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              onClick={downloadLog}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="sr-only">Download log</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              onClick={clearTerminal}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Clear terminal</span>
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div ref={hostRef} className="absolute inset-0 p-2" />
        </div>
      </div>
    );
  },
);

TerminalComponent.displayName = "TerminalComponent";

export default TerminalComponent;
