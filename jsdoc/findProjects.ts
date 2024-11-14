import fs from "fs";
import { idProject } from './core.ts'
// [x] 1. find all .js files, save that in a file (find ts_downloads/base -name '*.js' >js-survey-filenames.txt)
// [x] 2. strip filenames down to project + prefix
// [x] 3. find one instance of each project (smallest prefix)
// [x] 4. save *that* in a file (findProjects.ts -> jsdoc-survey-projects.txt)
// [x] 5. find projects on npm and filter those without publishes in the last 2 years (filterNewProjects.ts -> jsdoc-survey-recent-projects.txt)
// [x] 6. find all files with a matching prefix, save that in a file (filterNewFiles.ts -> js-survey-recent-filenames.txt)
// [x] 7. loop over all files, parsing and looking for particular nodes
// [x] 8. output in a format similar to jsdoc-syntax-maps.txt (parseSurvey.ts -> jsdoc-syntax-maps-2.txt)
// [ ] do (7) and (8) again, but for semantically interesting JS usage (inferred from syntax only)
//     (semanticSurvey -> jsdoc-semantic-maps-2.txt)

const original = fs
  .readFileSync("js-survey-filenames.txt", "utf8")
  .split("\n")
  //.slice(0,10000)
  .map((l) => {
    let x = l.trim();
    if (x) return idProject(x)
    else return { file: "NONE", project: "NONE", prefix: "NONE" }
  });
const prefixes = new Map<string, string>();
for (const project of original) {
    const existing = prefixes.get(project.project) || project.prefix
    if (project.prefix.length <= existing.length) {
        prefixes.set(project.project, existing)
    }
}
// TODO: Skip the NONE and the ts_download with empty prefix
for (const [project, prefix] of prefixes) {
    if (!prefix || project === "NONE") continue
    console.log(JSON.stringify({ project, prefix }))
}
