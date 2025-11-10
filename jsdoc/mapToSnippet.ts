import fs from "fs";
import ts from "typescript";
import path from "path";

for (const line of fs.readFileSync("jsdoc-semantics-maps.txt", "utf8").split("\n")) {
  console.log(getSnippet(line));
}

function getSnippet(line: string) {
  if (!line.startsWith("  ")) return line;
  line = line.trim();
  const [sstart, send, file] = line.split(",");
  const start = Math.max(0, +sstart - 10);
  const end = +send + 10;
  if (start === -1 || end === -1) return line;
  try {
    return fs
      .readFileSync(path.join("/home/nathan/src/typescript-error-deltas/ts_downloads/base", file), "utf8")
      .slice(start, end)
      .replace(/\r?\n/, "\\n");
  } catch {
    // console.error("Bad snippet", line, file);
    return line;
  }
}
