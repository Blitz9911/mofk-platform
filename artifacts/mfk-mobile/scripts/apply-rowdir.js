const fs = require("fs");
const path = require("path");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !["node_modules", "dist-test", "dist-test-verify-env"].includes(entry.name)) {
      walk(full);
      continue;
    }
    if (!/\.(tsx|ts)$/.test(entry.name)) continue;
    let source = fs.readFileSync(full, "utf8");
    if (!/flexDirection:\s*["']row-reverse["']/.test(source)) continue;
    if (!source.includes("@/lib/layout")) {
      const lines = source.split("\n");
      let lastImport = -1;
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].startsWith("import ")) lastImport = i;
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, 'import { rowDir } from "@/lib/layout";');
        source = lines.join("\n");
      }
    }
    source = source.replace(/flexDirection:\s*["']row-reverse["']/g, "flexDirection: rowDir");
    fs.writeFileSync(full, source);
    console.log(full);
  }
}

walk(path.join("artifacts", "mfk-mobile", "app"));
walk(path.join("artifacts", "mfk-mobile", "components"));
