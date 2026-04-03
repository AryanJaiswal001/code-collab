"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeProviderProps = React.PropsWithChildren<{
  attribute?: "class" | `data-${string}`;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
}>;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  themes: Theme[];
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important}",
    ),
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
}

function applyThemeToDocument({
  attribute,
  enableColorScheme,
  resolvedTheme,
}: {
  attribute: NonNullable<ThemeProviderProps["attribute"]>;
  enableColorScheme: boolean;
  resolvedTheme: ResolvedTheme;
}) {
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  } else {
    root.setAttribute(attribute, resolvedTheme);
  }

  if (enableColorScheme) {
    root.style.colorScheme = resolvedTheme;
  }
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] =
    React.useState<ResolvedTheme>("light");
  const themes = React.useMemo<Theme[]>(() => ["light", "dark", "system"], []);

  React.useEffect(() => {
    const nextSystemTheme = getSystemTheme();
    setSystemTheme(nextSystemTheme);

    try {
      const storedTheme = window.localStorage.getItem(storageKey) as
        | Theme
        | null;
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        setThemeState(storedTheme);
      } else {
        setThemeState(defaultTheme);
      }
    } catch {
      setThemeState(defaultTheme);
    }
  }, [defaultTheme, storageKey]);

  React.useEffect(() => {
    if (!enableSystem || typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(getSystemTheme());

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [enableSystem]);

  const resolvedTheme: ResolvedTheme =
    enableSystem && theme === "system" ? systemTheme : (theme as ResolvedTheme);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const cleanup = disableTransitionOnChange
      ? disableTransitionsTemporarily()
      : undefined;

    applyThemeToDocument({
      attribute,
      enableColorScheme,
      resolvedTheme,
    });

    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {}

    cleanup?.();
  }, [
    attribute,
    disableTransitionOnChange,
    enableColorScheme,
    resolvedTheme,
    storageKey,
    theme,
  ]);

  const setTheme = React.useCallback<ThemeContextValue["setTheme"]>(
    (value) => {
      setThemeState((currentTheme) =>
        typeof value === "function" ? value(currentTheme) : value,
      );
    },
    [],
  );

  const contextValue = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      setTheme,
      themes,
    }),
    [resolvedTheme, setTheme, systemTheme, theme, themes],
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
