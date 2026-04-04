"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { SearchAddon } from "xterm-addon-search";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import { Copy, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TerminalProps = {
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: WebContainer | null;
};

export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
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

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(
  ({ className, theme = "dark", webContainerInstance }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const searchRef = useRef<SearchAddon | null>(null);
    const processRef = useRef<WebContainerProcess | null>(null);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const inputLineRef = useRef("");
    const [connected, setConnected] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const writePrompt = useCallback(() => {
      termRef.current?.write("\r\n$ ");
      inputLineRef.current = "";
    }, []);

    const clearTerminal = useCallback(() => {
      if (!termRef.current) {
        return;
      }

      termRef.current.clear();
      termRef.current.writeln("Code Collab terminal");
      writePrompt();
    }, [writePrompt]);

    useImperativeHandle(
      ref,
      () => ({
        writeToTerminal: (data: string) => {
          termRef.current?.write(data);
        },
        clearTerminal,
        focusTerminal: () => {
          termRef.current?.focus();
        },
      }),
      [clearTerminal],
    );

    const runCommand = useCallback(
      async (command: string) => {
        if (!termRef.current) {
          return;
        }

        const trimmedCommand = command.trim();
        if (!trimmedCommand) {
          writePrompt();
          return;
        }

        if (trimmedCommand === "clear") {
          clearTerminal();
          return;
        }

        if (trimmedCommand === "help") {
          termRef.current.writeln("");
          termRef.current.writeln("Available commands:");
          termRef.current.writeln("  clear");
          termRef.current.writeln("  help");
          termRef.current.writeln("  ls");
          termRef.current.writeln("  npm run dev");
          writePrompt();
          return;
        }

        if (!webContainerInstance) {
          termRef.current.writeln(
            "\r\nWebContainer is not ready yet. Wait for setup to complete.",
          );
          writePrompt();
          return;
        }

        if (historyRef.current.at(-1) !== trimmedCommand) {
          historyRef.current.push(trimmedCommand);
        }
        historyIndexRef.current = -1;

        const [commandName, ...args] = trimmedCommand.split(/\s+/);
        termRef.current.writeln("");

        try {
          const process = await webContainerInstance.spawn(commandName, args, {
            terminal: {
              cols: termRef.current.cols,
              rows: termRef.current.rows,
            },
          });

          processRef.current = process;
          await process.output.pipeTo(
            new WritableStream({
              write(chunk) {
                termRef.current?.write(chunk);
              },
            }),
          );
          await process.exit;
        } catch (error) {
          termRef.current.writeln(`\r\nCommand failed: ${trimmedCommand}`);
          console.error("Terminal command failed:", error);
        } finally {
          processRef.current = null;
          writePrompt();
        }
      },
      [clearTerminal, webContainerInstance, writePrompt],
    );

    const handleInput = useCallback(
      (data: string) => {
        if (!termRef.current) {
          return;
        }

        if (data === "\r") {
          void runCommand(inputLineRef.current);
          return;
        }

        if (data === "\u007F") {
          if (!inputLineRef.current.length) {
            return;
          }

          inputLineRef.current = inputLineRef.current.slice(0, -1);
          termRef.current.write("\b \b");
          return;
        }

        if (data === "\u001b[A") {
          if (!historyRef.current.length) {
            return;
          }

          if (historyIndexRef.current === -1) {
            historyIndexRef.current = historyRef.current.length - 1;
          } else {
            historyIndexRef.current = Math.max(historyIndexRef.current - 1, 0);
          }

          const nextValue = historyRef.current[historyIndexRef.current] ?? "";
          termRef.current.write(
            `\r$ ${" ".repeat(inputLineRef.current.length)}\r$ ${nextValue}`,
          );
          inputLineRef.current = nextValue;
          return;
        }

        if (data === "\u001b[B") {
          if (historyIndexRef.current === -1) {
            return;
          }

          historyIndexRef.current += 1;
          const nextValue =
            historyRef.current[historyIndexRef.current] ?? "";
          termRef.current.write(
            `\r$ ${" ".repeat(inputLineRef.current.length)}\r$ ${nextValue}`,
          );
          inputLineRef.current = nextValue;

          if (historyIndexRef.current >= historyRef.current.length - 1) {
            historyIndexRef.current = -1;
          }
          return;
        }

        if (data < " " && data !== "\t") {
          return;
        }

        inputLineRef.current += data;
        termRef.current.write(data);
      },
      [runCommand],
    );

    useEffect(() => {
      if (!hostRef.current || termRef.current) {
        return;
      }

      const terminal = new Terminal({
        cursorBlink: true,
        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        theme: terminalThemes[theme],
        convertEol: true,
        scrollback: 2000,
      });
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddon);
      terminal.open(hostRef.current);
      fitAddon.fit();
      terminal.onData(handleInput);
      terminal.writeln("Code Collab terminal");
      writePrompt();

      termRef.current = terminal;
      fitRef.current = fitAddon;
      searchRef.current = searchAddon;

      const resizeObserver = new ResizeObserver(() => {
        fitRef.current?.fit();
      });
      resizeObserver.observe(hostRef.current);

      return () => {
        resizeObserver.disconnect();
        processRef.current?.kill();
        terminal.dispose();
        termRef.current = null;
        fitRef.current = null;
        searchRef.current = null;
      };
    }, [handleInput, theme, writePrompt]);

    useEffect(() => {
      setConnected(Boolean(webContainerInstance));
    }, [webContainerInstance]);

    const copySelection = useCallback(async () => {
      const selection = termRef.current?.getSelection() ?? "";
      if (!selection) {
        return;
      }

      await navigator.clipboard.writeText(selection);
    }, []);

    const searchInTerminal = useCallback((value: string) => {
      searchRef.current?.findNext(value);
    }, []);

    return (
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden border-t border-white/10 bg-[#050816]",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
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

          <div className="flex items-center gap-1">
            {showSearch ? (
              <Input
                value={searchTerm}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchTerm(nextValue);
                  searchInTerminal(nextValue);
                }}
                placeholder="Search"
                className="h-7 w-32 border-white/10 bg-white/5 text-xs text-white"
              />
            ) : null}

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setShowSearch((value) => !value)}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => void copySelection()}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={clearTerminal}
            >
              <Trash2 className="h-3.5 w-3.5" />
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
