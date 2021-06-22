// Usage (because I don't feel like using shelljs I guess)
// node astsurvey.js file1.ts file2.js file3.d.ts
// or more likely:
// find . -iname '*.js' | xargs node astsurvey.js
// TODO: This could be MUCH faster by searching for 'require', then
// walking up the tree a bit to see if the containing structure matches
const ts = require('typescript')
const fs = require('fs')

/** @type {(text: ts.__String) => (method: ts.ClassElement) => boolean | undefined} */
const isBound = text => method => {
    const name = ts.getNameOfDeclaration(method)
    return name && ts.isIdentifier(name) && name.escapedText === text
}

/** @type {(node: ts.Node) => (tag: ts.JSDocTag) => unknown} */
const isSingleName = node => tag =>
    ts.isClassLike(node.parent)
    && (ts.isJSDocSeeTag(tag)
        && tag.name
        && ts.isIdentifier(tag.name.name)
        && node.parent.members.some(isBound(tag.name.name.escapedText))
        || Array.isArray(tag.comment)
        && tag.comment.some(c => ts.isJSDocLink(c) && c.name && ts.isIdentifier(c.name) && node.parent.members.some(isBound(c.name.escapedText))))

/** @type {(node: ts.Node) => boolean} */
const isSingleLink = node =>
    Array.isArray(node.jsDoc?.[0].comment)
    && node.jsDoc[0].comment.some(c =>
        ts.isJSDocLink(c)
        && c.name
        && ts.isIdentifier(c.name)
        && ts.isClassLike(node.parent)
        && node.parent.members.some(isBound(c.name.escapedText)))
/** @param {string} s */
function countBlanks(s) {
    return s.split('\n').filter(line => line.trim() === '').length
}


// console.error(process.argv.slice(2))
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
        // const tags = ts.getJSDocTags(node)
        // // note: this is going to miss link stuff, I have to look at the jsdoccomment =(
        // // and the comment for each tag =(((
        // if (isSingleLink(node) || tags.some(isSingleName(node))) {
        if (node.jsDoc && node.jsDoc?.[0].tags?.some(t => ts.isJSDocTypedefTag(t))) {
            // const text = sourceFile.text.slice(node.pos, node.end).replace(/\n/g, '')
            const tags = node.jsDoc[0].tags.map(t => t.tagName.escapedText).join(",")
            console.log(`${file}:(${tags}) ${node.pos}`)
            // let path = []
            // let cur = node.parent
            // while (cur) {
            //     path.push(ts.SyntaxKind[cur.kind])
            //     cur = cur.parent;
            // }
            // console.log(file + ":", node.pos, path.slice(0,2))
        }
        return ts.forEachChild(node, walk)
    }
    walk(sourceFile)
}
