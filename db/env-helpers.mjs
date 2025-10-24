import fs from "node:fs";
import path from "node:path";

const ENV_FILES = [".env.local", ".env"];

function decodeValue(raw) {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const inner = value.slice(1, -1);
    return inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }
  return value;
}

export function loadEnv(rootDir = process.cwd()) {
  for (const filename of ENV_FILES) {
    const filepath = path.join(rootDir, filename);
    if (!fs.existsSync(filepath)) {
      continue;
    }

    const contents = fs.readFileSync(filepath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, equalsIndex).trim();
      const value = decodeValue(trimmed.slice(equalsIndex + 1));
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
