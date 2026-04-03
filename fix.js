/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");

const content = fs.readFileSync("public/home.svg", "utf8");

fs.writeFileSync(
  "public/home.svg",
  content.replace(/@"/g, "").replace(/"@/g, "").trim(),
);
