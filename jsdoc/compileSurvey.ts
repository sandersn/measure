type RawUsage = {
  type: string;
  position: { start: number; end?: number };
  fileName: string;
};
type Usage = {
  type: string;
  position: { start: number; end?: number };
  file: string;
  project: ProjectName;
};

// here's a good grep
// find . -name '*.ts' | xargs grep '@return' | cut -c1-200 >~/src/measure/experiments/user-ts-return.txt

import fs from "fs";
import { idProject } from "./core.ts";
import type { ProjectName, Projects, FileLocationKey, Payload } from "./core.ts";
const original: RawUsage[] = fs
  // .readFileSync("jsdoc-syntax.txt", "utf8")
  .readFileSync("jsdoc-semantics.txt", "utf8")
  .split("\n")
  .map((l, i) => {
    let x = l.trim();
    if (x)
      try {
        return JSON.parse(l.trim());
      } catch (e) {
        console.error("Bad JSON on line", i);
        throw e;
      }
    else return { fileName: "NONE", position: { start: 0 }, type: "NONE" };
  });
const projects = makeProjects(original.map(u => ({ ...u, ...idProject(u.fileName) })));
for (const [name, project] of projects) {
  console.log(name, "=>", project.size);
  for (const [file, kind] of project) {
    if (kind === "JSDocText" || kind === "JSDocTag" || file.endsWith(".ts")) continue;
    console.log("  ", file, "=>", kind);
  }
}

function makeProjects(usages: Usage[]) {
  const projects: Projects = new Map();
  for (const u of usages) {
    const project: Map<FileLocationKey, Payload> = projects.get(u.project) || new Map();
    projects.set(u.project, project);
    const key = `${u.position.start},${u.position.end ?? ""},${u.file}`;
    const kind = project.get(key);
    if (kind) {
      if (kind !== u.type) {
        const kinds = new Set(kind.split(","));
        if (!kinds.has(u.type)) {
          project.set(key, kind + "," + u.type);
        }
      }
    } else {
      project.set(key, u.type);
    }
  }
  return projects;
}
