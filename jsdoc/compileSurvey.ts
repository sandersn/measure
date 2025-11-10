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
import type { ProjectName  } from "./core.ts";
export type FileLocationKey = string;
export type Feature = string;
export type Projects = Map<Feature, Set<FileLocationKey>> // ProjectName, Map<FileLocationKey, Feature>>;
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
for (const [feature, locs] of projects) {
  console.log(feature, "=>", locs.size);
  for (const loc of Array.from(locs).sort()) {
    if (loc.endsWith(".ts")) continue;
    console.log("  ", loc);
  }
}

function makeProjects(usages: Usage[]) {
  const projects: Projects = new Map();
  for (const u of usages) {
    const locs: Set<FileLocationKey> = projects.get(u.type) || new Set();
    projects.set(u.type, locs);
    const key = `${u.position.start},${u.position.end ?? ""},${u.file}`;
    locs.add(key)
  }
  return projects;
}
