import fs from "fs";
import { RawPrefixes } from './core.ts'
const projects: RawPrefixes = fs
  .readFileSync("js-survey-projects.txt", "utf8")
  .split("\n")
  //.slice(0,10000)
  .map((l) => {
    let x = l.trim();
    if (x) return JSON.parse(x)
    else return { project: "NONE", prefix: "NONE" }
  });
// [ ] 5. look up projects on npm and filter those without publishes in the last 2 years
import fetch from "node-fetch";

const TWO_YEARS_AGO = new Date();
TWO_YEARS_AGO.setFullYear(TWO_YEARS_AGO.getFullYear() - 2);

async function filterRecentProjects(projects: Array<{ project: string, prefix: string }>) {
  const filtered: RawPrefixes = [];
  for (const p of projects) {
    try {
      const res = await fetch(`https://registry.npmjs.org/${p.project}`);
      const data = await res.json();
      const lastPublish = new Date(data.time.modified);
      if (lastPublish >= TWO_YEARS_AGO) {
        filtered.push(p);
      } else {
        console.error(p.project, "is too old");
      }
    } catch (e) {
      console.error(p.project)
      console.error(e)
    }
  }
  return filtered;
}

(async () => {
  const recentProjects = await filterRecentProjects(projects);
  for (const p of recentProjects) {
    console.log(JSON.stringify(p))
  }
})();
