import fs from "fs";
import ts from "typescript";
import path from "path";
import { idProject, unaliasKind } from "./core.ts";
const interesting = new Set([
  // ts.SyntaxKind.JSDoc, // prints as JSDocComment
  // ts.SyntaxKind.JSDocText,
  ts.SyntaxKind.JSDocTypeLiteral,
  ts.SyntaxKind.JSDocNameReference,
  ts.SyntaxKind.JSDocSignature,
  // ts.SyntaxKind.JSDocTypeExpression,

  ts.SyntaxKind.JSDocFunctionType,
  ts.SyntaxKind.JSDocVariadicType,
  ts.SyntaxKind.JSDocNonNullableType,
  ts.SyntaxKind.JSDocNullableType,
  ts.SyntaxKind.JSDocAllType,
  ts.SyntaxKind.JSDocUnknownType,
  ts.SyntaxKind.JSDocNamepathType,
  ts.SyntaxKind.JSDocOptionalType,

  ts.SyntaxKind.JSDocCallbackTag,
  ts.SyntaxKind.JSDocTypedefTag,
  ts.SyntaxKind.JSDocTypeTag,
  ts.SyntaxKind.JSDocTemplateTag,
  ts.SyntaxKind.JSDocPropertyTag,
  ts.SyntaxKind.JSDocParameterTag,
  ts.SyntaxKind.JSDocReturnTag,
  ts.SyntaxKind.JSDocClassTag,
  ts.SyntaxKind.JSDocPublicTag,
  ts.SyntaxKind.JSDocPrivateTag,
  ts.SyntaxKind.JSDocProtectedTag,
  ts.SyntaxKind.JSDocReadonlyTag,
  ts.SyntaxKind.JSDocOverrideTag,
  ts.SyntaxKind.JSDocDeprecatedTag,
  ts.SyntaxKind.JSDocSeeTag,
  ts.SyntaxKind.JSDocThrowsTag,
  ts.SyntaxKind.JSDocAuthorTag,
  ts.SyntaxKind.JSDocImplementsTag,
  ts.SyntaxKind.JSDocAugmentsTag,
  ts.SyntaxKind.JSDocSatisfiesTag,
  ts.SyntaxKind.JSDocThisTag,
  ts.SyntaxKind.JSDocImportTag,
  ts.SyntaxKind.JSDocOverloadTag,
  ts.SyntaxKind.JSDocEnumTag,
]);

const files = fs
  .readFileSync("jsdoc-survey-recent-filenames.txt", "utf8")
  .split("\n")
  .filter(l => l.trim());
type Kinds = Map<string, Set<string>>;
type Assignments = Map<string, { total: number; binary: number; assignment: number }>;
// const kindmap: Kinds = new Map();
const kindmap: Assignments = new Map();
let i = 0
for (const fullfile of files) {
  if (i > 1_000_000_000) break;
  const { file, project } = idProject(fullfile);
  binaryAssignmentRatio(
    path.join("/home/nathan/src/typescript-error-deltas", fullfile),
    path.join(project, file),
    kindmap
  );
  i++;
}

console.log(kindmap.size);
for (const [filename, { total, binary, assignment }] of kindmap) {
  console.log(filename, "=>", binary, assignment, assignment / binary, total);
}

function binaryAssignmentRatio(fullfile: string, file: string, kindmap: Assignments) {
  let fileContents;
  try {
    fileContents = fs.readFileSync(fullfile, "utf8");
  } catch (e) {
    if (
      !/node_modules\/[-\w.]+?\.js$/.test(fullfile) &&
      !/node_modules\/@[-\w.]+?\/[-\w.]+?\.js$/.test(fullfile) &&
      !/node_modules\/ember-source\/dist\/packages\/backburner.js$/.test(fullfile)
    ) {
      console.error("Bad file", fullfile);
      throw e;
    } else {
      // console.error("Skipping", fullfile);
      return;
    }
  }
  let total = 0;
  let binary = 0;
  let assignment = 0;
  visit(ts.createSourceFile(fullfile, fileContents, ts.ScriptTarget.Latest, true));
  // group by .ts/.js
  const extension = path.extname(fullfile);
  const sizeBucket = Math.floor(Math.log10(total)).toString();
  const ext = kindmap.get(extension) ?? { total: 0, binary: 0, assignment: 0 };
  const size = kindmap.get(sizeBucket) ?? { total: 0, binary: 0, assignment: 0 };
  ext.total++;
  size.total++;
  ext.binary += binary;
  size.binary += binary;
  ext.assignment += assignment;
  size.assignment += assignment;
  kindmap.set(extension, ext);
  kindmap.set(sizeBucket, size);

  function visit(node: ts.Node) {
    total++;
    if (ts.isBinaryExpression(node)) {
      binary++;
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        assignment++;
      }
    }
    ts.forEachChild(node, visit);
  }
}

function findJSDocTags(fullfile: string, file: string, kindmap: Map<string, Set<string>>) {
  let fileContents;
  try {
    fileContents = fs.readFileSync(fullfile, "utf8");
  } catch (e) {
    if (
      !/node_modules\/[-\w.]+?\.js$/.test(fullfile) &&
      !/node_modules\/@[-\w.]+?\/[-\w.]+?\.js$/.test(fullfile) &&
      !/node_modules\/ember-source\/dist\/packages\/backburner.js$/.test(fullfile)
    ) {
      console.error("Bad file", fullfile);
      throw e;
    } else {
      // console.error("Skipping", fullfile);
      return;
    }
  }
  visit(ts.createSourceFile(fullfile, fileContents, ts.ScriptTarget.Latest, true));

  function visit(node: ts.Node) {
    const nodekind = unaliasKind(node.kind);
    if ((node as any).jsDoc) {
      for (const tag of (node as any).jsDoc) {
        visit(tag);
      }
    }
    if (interesting.has(node.kind)) {
      const kind = kindmap.get(nodekind) || new Set();
      const key = `${node.getStart()},${node.getEnd()},${file}`;
      kind.add(key);
      kindmap.set(nodekind, kind);
    }
    ts.forEachChild(node, visit);
  }
}
