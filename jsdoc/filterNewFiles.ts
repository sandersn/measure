import fs from "fs";
import path from "path";
const projects: string[] = fs
  .readFileSync("js-survey-recent-projects.txt", "utf8")
  .split("\n")
  //.slice(0,10000)
  .filter((l) => l.trim())
  .map((l) => {
    let x = l.trim();
    let project = JSON.parse(l.trim());
    return path.join(project.prefix, project.project);
  });
const files = fs
  .readFileSync("js-survey-filenames.txt", "utf8")
  .split("\n")
  .filter((l) => l.trim());
let i = 0;
for (const file of files) {
  i++;
  if (projects.some((p) => file.startsWith(p) && file.indexOf("node_modules", p.length) === -1)) {
    console.log(file);
  }
  if (i % 1000 === 0)
    process.stderr.write(' ' + i / 1_000_000)
}
