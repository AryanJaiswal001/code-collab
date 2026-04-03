const fs = require("fs"); let c = fs.readFileSync("public/home.svg", "utf8"); fs.writeFileSync("public/home.svg", c.replace(/@"/g, "").replace(/"@/g, "").trim());
