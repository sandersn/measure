import path from "path";
import ts from "typescript";
export type ProjectName = string;
export type RawPrefixes = Array<{ project: string; prefix: string }>;
/**
 * Split a usage's filename into project name and path within the project.
 */
export function idProject(fileName: string): { file: string; project: ProjectName; prefix: string } {
  const parts = fileName.split(path.sep);
  // walk up the path until we find a node_modules or ts/built/local
  let i = parts.length - 1;
  while (
    i >= 0 &&
    parts[i] !== "node_modules" &&
    !(parts[i] === "overlay" && parts[i - 1] === "ts_downloads") &&
    !(parts[i] === "local" && parts[i - 1] === "built")
  ) {
    i--;
  }
  const prefix = parts.slice(0, i + 1).join(path.sep);
  if (parts[i] === "local" || parts[i] === "overlay") {
    return {
      project: parts[i] === "local" ? "typescript" : parts[i + 1],
      file: parts.slice(i + 1).join(path.sep),
      prefix,
    };
  } else if (parts[i + 1].startsWith("@") && parts.length > i + 2) {
    if (parts[i + 2] === undefined) {
      console.log(parts);
      throw new Error("bad filename: " + fileName);
    }
    return {
      project: path.join(parts[i + 1], parts[i + 2]),
      file: parts.slice(i + 3).join(path.sep),
      prefix,
    };
  } else {
    return {
      project: parts[i + 1],
      file: parts.slice(i + 2).join(path.sep),
      prefix,
    };
  }
}
export function unaliasKind(kind: ts.SyntaxKind): string {
  switch (kind) {
    case ts.SyntaxKind.FirstAssignment:
      return "EqualsToken";
    case ts.SyntaxKind.LastAssignment:
      return "CaretEqualsToken";
    case ts.SyntaxKind.FirstCompoundAssignment:
      return "PlusEqualsToken";
    case ts.SyntaxKind.LastCompoundAssignment:
      return "CaretEqualsToken";
    case ts.SyntaxKind.FirstReservedWord:
      return "BreakKeyword";
    case ts.SyntaxKind.LastReservedWord:
      return "WithKeyword";
    case ts.SyntaxKind.FirstKeyword:
      return "BreakKeyword";
    case ts.SyntaxKind.LastKeyword:
      return "OfKeyword";
    case ts.SyntaxKind.FirstFutureReservedWord:
      return "ImplementsKeyword";
    case ts.SyntaxKind.LastFutureReservedWord:
      return "YieldKeyword";
    case ts.SyntaxKind.FirstTypeNode:
      return "TypePredicate";
    case ts.SyntaxKind.LastTypeNode:
      return "ImportType";
    case ts.SyntaxKind.FirstPunctuation:
      return "OpenBraceToken";
    case ts.SyntaxKind.LastPunctuation:
      return "CaretEqualsToken";
    case ts.SyntaxKind.FirstToken:
      return "Unknown";
    case ts.SyntaxKind.LastToken:
      return "OfKeyword";
    case ts.SyntaxKind.FirstTriviaToken:
      return "SingleLineCommentTrivia";
    case ts.SyntaxKind.LastTriviaToken:
      return "ConflictMarkerTrivia";
    case ts.SyntaxKind.FirstLiteralToken:
      return "NumericLiteral";
    case ts.SyntaxKind.LastLiteralToken:
      return "NoSubstitutionTemplateLiteral";
    case ts.SyntaxKind.FirstTemplateToken:
      return "NoSubstitutionTemplateLiteral";
    case ts.SyntaxKind.LastTemplateToken:
      return "TemplateTail";
    case ts.SyntaxKind.FirstBinaryOperator:
      return "LessThanToken";
    case ts.SyntaxKind.LastBinaryOperator:
      return "CaretEqualsToken";
    case ts.SyntaxKind.FirstStatement:
      return "VariableStatement";
    case ts.SyntaxKind.LastStatement:
      return "DebuggerStatement";
    case ts.SyntaxKind.FirstNode:
      return "QualifiedName";
    case ts.SyntaxKind.FirstJSDocNode:
      return "JSDocTypeExpression";
    case ts.SyntaxKind.LastJSDocNode:
      return "JSDocImportTag";
    case ts.SyntaxKind.FirstJSDocTagNode:
      return "JSDocTag";
    case ts.SyntaxKind.LastJSDocTagNode:
      return "JSDocImportTag";
    default:
      kind = ts.SyntaxKind[kind];
      if (kind === "FirstContextualKeyword") {
        return "AbstractKeyword";
      } else if (kind === "LastContextualKeyword") {
        return "OfKeyword";
      } else {
        return kind;
      }
  }
}
