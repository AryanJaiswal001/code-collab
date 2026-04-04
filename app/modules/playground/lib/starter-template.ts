import type { TemplateFolder } from "../types";

function getPackageJson(projectName: string) {
  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      private: true,
      version: "0.0.1",
      type: "module",
      scripts: {
        dev: "vite --host 0.0.0.0 --port 4173",
        build: "tsc -b && vite build",
        preview: "vite preview --host 0.0.0.0 --port 4173",
      },
      dependencies: {
        react: "^19.2.0",
        "react-dom": "^19.2.0",
      },
      devDependencies: {
        "@types/react": "^19.2.0",
        "@types/react-dom": "^19.2.0",
        "@vitejs/plugin-react": "^5.0.0",
        typescript: "^5.9.0",
        vite: "^7.1.0",
      },
    },
    null,
    2,
  );
}

export function createStarterTemplate(projectName: string): TemplateFolder {
  return {
    folderName: projectName,
    items: [
      {
        filename: "package",
        fileExtension: "json",
        content: getPackageJson(projectName),
      },
      {
        filename: "tsconfig",
        fileExtension: "json",
        content: JSON.stringify(
          {
            compilerOptions: {
              target: "ES2020",
              useDefineForClassFields: true,
              lib: ["DOM", "DOM.Iterable", "ES2020"],
              allowJs: false,
              skipLibCheck: true,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              strict: true,
              forceConsistentCasingInFileNames: true,
              module: "ESNext",
              moduleResolution: "Node",
              resolveJsonModule: true,
              isolatedModules: true,
              noEmit: true,
              jsx: "react-jsx",
            },
            include: ["src"],
            references: [{ path: "./tsconfig.node.json" }],
          },
          null,
          2,
        ),
      },
      {
        filename: "tsconfig.node",
        fileExtension: "json",
        content: JSON.stringify(
          {
            compilerOptions: {
              composite: true,
              module: "ESNext",
              moduleResolution: "Node",
              allowSyntheticDefaultImports: true,
            },
            include: ["vite.config.ts"],
          },
          null,
          2,
        ),
      },
      {
        filename: "vite.config",
        fileExtension: "ts",
        content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 4173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
`,
      },
      {
        filename: "index",
        fileExtension: "html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      },
      {
        folderName: "src",
        items: [
          {
            filename: "main",
            fileExtension: "tsx",
            content: `import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
          },
          {
            filename: "App",
            fileExtension: "tsx",
            content: `import { CounterCard } from "./components/CounterCard";
import { projectHighlights } from "./lib/content";

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Portable playground</p>
        <h1>${projectName}</h1>
        <p className="lede">
          Edit the files in the explorer, save your changes, and the running preview will update inside the WebContainer.
        </p>
      </section>

      <section className="grid">
        {projectHighlights.map((item) => (
          <article key={item.title} className="panel">
            <span className="pill">{item.label}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <CounterCard />
    </main>
  );
}
`,
          },
          {
            filename: "index",
            fileExtension: "css",
            content: `:root {
  color-scheme: dark;
  font-family: "Figtree", "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top, rgba(34, 197, 94, 0.2), transparent 30%),
    linear-gradient(180deg, #040816 0%, #0f172a 100%);
  color: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

button,
input,
textarea {
  font: inherit;
}

.shell {
  display: grid;
  gap: 2rem;
  max-width: 1080px;
  margin: 0 auto;
  padding: 3rem 1.25rem 4rem;
}

.hero {
  display: grid;
  gap: 1rem;
}

.eyebrow,
.pill {
  width: fit-content;
  border: 1px solid rgba(248, 250, 252, 0.16);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.eyebrow {
  color: #86efac;
}

.pill {
  color: #7dd3fc;
}

.lede {
  max-width: 54rem;
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.7;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.panel,
.counter {
  border: 1px solid rgba(248, 250, 252, 0.1);
  background: rgba(15, 23, 42, 0.72);
  border-radius: 24px;
  padding: 1.25rem;
  backdrop-filter: blur(18px);
}

.panel h2,
.counter h2 {
  margin: 1rem 0 0.35rem;
  font-size: 1.1rem;
}

.panel p,
.counter p {
  margin: 0;
  color: rgba(226, 232, 240, 0.76);
  line-height: 1.65;
}

.counter {
  display: grid;
  gap: 1rem;
}

.counter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.counter button {
  border: 0;
  border-radius: 999px;
  padding: 0.8rem 1.15rem;
  background: #f8fafc;
  color: #0f172a;
  cursor: pointer;
}

.counter strong {
  font-size: clamp(2rem, 5vw, 3rem);
}
`,
          },
          {
            folderName: "components",
            items: [
              {
                filename: "CounterCard",
                fileExtension: "tsx",
                content: `import { useState } from "react";

export function CounterCard() {
  const [count, setCount] = useState(0);

  return (
    <section className="counter">
      <div>
        <p className="pill">Live preview</p>
        <h2>State survives code edits</h2>
        <p>
          The terminal, preview, and editor are all backed by the same WebContainer session.
        </p>
      </div>

      <div className="counter-row">
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          Increment
        </button>
        <strong>{count}</strong>
      </div>
    </section>
  );
}
`,
              },
            ],
          },
          {
            folderName: "lib",
            items: [
              {
                filename: "content",
                fileExtension: "ts",
                content: `export const projectHighlights = [
  {
    label: "Explorer",
    title: "Nested files and folders",
    description: "Create, rename, and delete files while keeping the tree in sync with the editor tabs.",
  },
  {
    label: "Editor",
    title: "Monaco with path-aware models",
    description: "Language mode follows the active file extension so TypeScript, JSON, CSS, and Markdown behave properly.",
  },
  {
    label: "Runtime",
    title: "WebContainer-backed preview",
    description: "The right pane installs dependencies, runs the app, and exposes the logs in the integrated terminal.",
  },
] as const;
`,
              },
            ],
          },
        ],
      },
    ],
  };
}
