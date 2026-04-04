import type { TemplateFolder } from "../types";

function getPackageJson(projectName: string) {
  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      private: true,
      version: "0.0.1",
      scripts: {
        dev: "vite --host 0.0.0.0 --port 4173",
      },
      devDependencies: {
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
        filename: "index",
        fileExtension: "html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
    <script type="module" src="/src/main.js"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,
      },
      {
        folderName: "src",
        items: [
          {
            filename: "main",
            fileExtension: "js",
            content: `import "./styles.css";

const root = document.querySelector("#app");

if (root) {
  root.innerHTML = \`
    <main class="app-shell">
      <span class="eyebrow">Code Collab</span>
      <h1>${projectName}</h1>
      <p>Your imported playground is now running in a minimum stable mode.</p>
      <button id="ping">Run interaction</button>
    </main>
  \`;

  document.querySelector("#ping")?.addEventListener("click", () => {
    console.log("Playground interaction fired.");
  });
}`,
          },
          {
            filename: "styles",
            fileExtension: "css",
            content: `:root {
  color-scheme: dark;
  font-family: "Segoe UI", sans-serif;
  background: #050816;
  color: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(34, 197, 94, 0.18), transparent 30%),
    linear-gradient(180deg, #050816 0%, #0f172a 100%);
}

.app-shell {
  display: grid;
  gap: 1rem;
  place-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.eyebrow {
  width: fit-content;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #86efac;
}

h1 {
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 4.5rem);
}

p {
  margin: 0;
  max-width: 40rem;
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.7;
}

button {
  width: fit-content;
  border: 0;
  border-radius: 999px;
  padding: 0.8rem 1.2rem;
  background: #f8fafc;
  color: #0f172a;
  font: inherit;
  cursor: pointer;
}`,
          },
        ],
      },
    ],
  };
}
