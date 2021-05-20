// Usage (because I don't feel like using shelljs I guess)
// node astsurvey.js file1.ts file2.js file3.d.ts
// or more likely:
// find . -iname '*.js' | xargs node astsurvey.js
// TODO: This could be MUCH faster by searching for 'require', then
// walking up the tree a bit to see if the containing structure matches
const ts = require('typescript')
const fs = require('fs')
// console.error(process.argv.slice(2).length)
let i = 0
for (const file of process.argv.slice(2)) {
    i++
    let source = ''
    try {
        source = fs.readFileSync(file, 'utf8')
    } catch (e) {
        console.error(e.toString())
        continue
    }
    let sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true);
    /**
     * @param {ts.Node} node
     * @returns {void}
     */
    const walk = function (node) {
        if (ts.isPropertyAccessExpression(node)
            && ts.isIdentifier(node.expression)
            && node.expression.escapedText === "Object"
            && node.name.escapedText === "defineProperties") {
            // const text = sourceFile.text.slice(node.pos, node.end).replace(/\n/g, '')
            let path = []
            let cur = node.parent
            while (cur) {
                path.push(ts.SyntaxKind[cur.kind])
                cur = cur.parent;
            }
            console.log(file + ":", node.pos, path.slice(0,2))
        }
        return ts.forEachChild(node, walk)
    }
    walk(sourceFile)
}
