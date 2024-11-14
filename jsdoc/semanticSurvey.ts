// [x] 8. output in a format similar to jsdoc-syntax-maps.txt (semanticSurvey.ts -> jsdoc-semantics-maps-2.txt)
import fs from "fs";
import ts from "typescript";
import path from "path";
import { idProject, unaliasKind } from "./core.ts";

const files = fs
  .readFileSync("jsdoc-survey-recent-filenames.txt", "utf8")
//   .readFileSync("js-test-filenames.txt", "utf8")
  .split("\n")
  .filter(l => l.trim());
type Kinds = Map<string, Set<string>>;
const kindmap: Kinds = new Map();
for (let fullfile of files) {
  const { file, project } = idProject(fullfile);
    fullfile = path.join("/home/nathan/src/typescript-error-deltas", fullfile)
//   fullfile = path.join("/home/nathan/src", fullfile);
  findJSUsage(fullfile, path.join(project, file), kindmap);
}

console.log(kindmap.size);
for (const [kind, project] of kindmap) {
  console.log(kind, "=>", project.size);
  for (const location of project) {
    console.log("  ", location);
  }
}

function findJSUsage(fullfile: string, file: string, usageMap: Map<string, Set<string>>) {
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
  let hasModuleExports = false;
  let hasModuleExportsProperty = false;
  const vars: Map<string, number> = new Map();
  const sourceFile = ts.createSourceFile(fullfile, fileContents, ts.ScriptTarget.Latest, true);
  visit(sourceFile);
  if (hasModuleExports && hasModuleExportsProperty) {
    const usage = "module.exports=+module.exports.p=";
    const kind = usageMap.get(usage) || new Set();
    const key = `-1,-1,${file}`;
    kind.add(key);
    usageMap.set(usage, kind);
  }
  for (const [name, count] of vars) {
    if (count > 1) {
      let originalkind;
      if (name.startsWith("this.")) {
        originalkind = "this";
      } else if (name.startsWith("module.exports.")) {
        originalkind = "module.exports.p";
      } else if (name.startsWith("module.exports")) {
        originalkind = "module.exports";
      } else if (name.includes(".prototype.")) {
        originalkind = "C.prototype.";
      } else {
        // TODO: might be something else!
        originalkind = "f.p";
      }
      const usage = "union-multiple-" + originalkind;
      const kind = usageMap.get(usage) || new Set();
      const key = `-1,-1,${file}`;
      kind.add(key);
      usageMap.set(usage, kind);
    }
  }

  function visit(node: ts.Node) {
    if ((node as any).jsDoc) {
      for (const tag of (node as any).jsDoc) {
        visit(tag);
      }
    }
    const uses = detect(sourceFile, node, vars);
    if (uses.length) {
      for (const usage of uses) {
        if (usage === "module.exports=") {
          hasModuleExports = true;
        } else if (usage === "module.exports.p=") {
          hasModuleExportsProperty = true;
        }
        const kind = usageMap.get(usage) || new Set();
        const key = `${node.getStart()},${node.getEnd()},${file}`;
        kind.add(key);
        usageMap.set(usage, kind);
      }
    }
    ts.forEachChild(node, visit);
  }
}

function detect(sourceFile: ts.SourceFile, node: ts.Node, vars: Map<string, number>): string[] {
  if (ts.isJSDocFunctionType(node) && (ts as any).isJSDocConstructSignature(node)) {
    return ["function(new)"];
  } else if (ts.isJSDocTypedefTag(node) && ts.isVariableStatement(node.parent.parent)) {
    return ["/** @typedef */var p;"];
  } else if (
    ts.isJSDocTypedefTag(node) &&
    ts.isExpressionStatement(node.parent.parent) &&
    ts.isPropertyAccessExpression(node.parent.parent.expression)
  ) {
    const uses = ["/** @typedef */p.q;"];
    const prop = node.parent.parent.expression;
    if (ts.isPropertyAccessExpression(prop.expression)) {
      uses.push("/** @typedef */p.q.r.T;");
    }
    return uses;
  } else if (
    ts.isJSDocTypeTag(node) &&
    ts.isExpressionStatement(node.parent.parent) &&
    ts.isPropertyAccessExpression(node.parent.parent.expression)
  ) {
    const prop = node.parent.parent.expression;
    const top =
      prop.expression.kind === ts.SyntaxKind.ThisKeyword
        ? "/** @type */this.p"
        : ts.isPropertyAccessExpression(prop.expression) && prop.expression.name.getText() === "prototype"
        ? "/** @type */C.prototype.p"
        : "/** @type */f.p";
    const uses = [top];
    if (ts.isPropertyAccessExpression(prop.expression)) {
      if (top === "/** @type */C.prototype.p") {
        if (!ts.isIdentifier((prop as any).expression.expression)) {
          uses.push("/** @type */x.y.C.prototype.p;");
        }
      } else {
        uses.push("/** @type */f.g.h.p;");
      }
    }
    return uses;
  } else if (ts.isBinaryExpression(node)) {
    const uses: string[] = [];
    const kind = (ts as any).getAssignmentDeclarationKind(node);
    if (kind === (ts as any).AssignmentDeclarationKind.ModuleExports) {
      uses.push("module.exports=");
      if ((ts as any).isEmptyObjectLiteral(node.right)) {
        uses.push("module.exports={}");
      } else if ((ts as any).isExportsOrModuleExportsOrAlias(sourceFile, node.right)) {
        uses.push("mod=module.exports=");
      } else if (
        ts.isObjectLiteralExpression(node.right) &&
        node.right.properties.every(ts.isShorthandPropertyAssignment)
      ) {
        uses.push("module.exports={a,b,c}");
      }
    } else if (kind === (ts as any).AssignmentDeclarationKind.ExportsProperty) {
      uses.push("module.exports.p=");
      if (
        !(ts as any).isExportsOrModuleExportsOrAlias(sourceFile, (node.left as ts.PropertyAccessExpression).expression)
      ) {
        uses.push("module.exports.p.q.r=");
      }
      if ((ts as any).isAliasableExpression(node.right)) {
        uses.push("module.exports.p=alias");
      }
    } else if (kind === (ts as any).AssignmentDeclarationKind.PrototypeProperty) {
      uses.push("C.prototype.p=");
      if (!ts.isIdentifier((node as any).left.expression.expression)) {
        uses.push("f.g.h.C.prototype.p=");
      }
    } else if (kind === (ts as any).AssignmentDeclarationKind.Prototype) {
      uses.push("C.prototype=");
      if (!ts.isIdentifier((node as any).left.expression)) {
        uses.push("x.y.C.prototype=");
      }
    } else if (kind === (ts as any).AssignmentDeclarationKind.ThisProperty) {
      uses.push("this.p=");
      if (ts.isSourceFile(node.parent.parent)) {
        if (node.parent.parent.text.includes("module.exports")) {
          uses.push("this.p=--module");
        } else {
          uses.push("this.p=--global");
        }
      }
      if (ts.isElementAccessExpression(node.left)) {
        uses.push("this[x]=");
      }
    } else if (kind === (ts as any).AssignmentDeclarationKind.Property) {
      if (ts.isPropertyAccessExpression(node.left)) {
        uses.push("f.p=");
        if (!ts.isIdentifier(node.left.expression)) {
          uses.push("f.g.h.p=");
        }
      } else if (ts.isElementAccessExpression(node.left)) {
        uses.push("f[x]=");
        if (!ts.isIdentifier(node.left.expression)) {
          uses.push("f.g.h[x]=");
        }
      }
    }
    const name = node.left.getText();
    vars.set(name, (vars.get(name) ?? 0) + 1);
    return uses;
  } else if (ts.isCallExpression(node)) {
    const uses: string[] = [];
    const kind = (ts as any).getAssignmentDeclarationKind(node);
    if (kind === (ts as any).AssignmentDeclarationKind.ObjectDefinePropertyExports) {
      uses.push("Object.defineProperty(module.exports, p)");
    } else if (kind === (ts as any).AssignmentDeclarationKind.ObjectDefinePropertyValue) {
      uses.push("Object.defineProperty(o, p)");
      if (!ts.isIdentifier(node.arguments[0])) {
        uses.push("Object.defineProperty(o.p.q.r, p)");
      }
    } else if (kind === (ts as any).AssignmentDeclarationKind.ObjectDefinePrototypeProperty) {
      uses.push("Object.defineProperty(C.prototype, p)");
    }
    return uses;
  } else if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    node.initializer.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return ["that=this"];
  } else if (ts.isJSDocVariadicType(node) && node.parent.parent.parent.parent.getText().includes("arguments")) {
    return ["arguments...typed"];
  } else if (ts.isTypeReferenceNode(node)) {
    switch (node.typeName.getText()) {
      case "String":
        return ["String"];
      case "Number":
        return ["Number"];
      case "Boolean":
        return ["Boolean"];
      case "Object":
        if (node.typeArguments?.length == 2) {
            return ["Object.<K,V>"];
        } else {
        return ["Object"];
        }
      case "array":
        return ["array"];
      case "Void":
        return ["Void"];
      case "Undefined":
        return ["Undefined"];
      case "promise":
        return ["promise"];
    }
  }
  return [];
}
