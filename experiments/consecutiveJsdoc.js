const readline = require('readline')
const sh = require('shelljs')
const fs = require('fs')
const process = require('process')
const ts = require('typescript')

/** @type {Array<{ total: number, prekinds: { [n: string]: number }}>} */
const histogram = [
    { total: 0, prekinds: {}},
    { total: 0, prekinds: {}},
    { total: 0, prekinds: {}},
    { total: 0, prekinds: {}},
    { total: 0, prekinds: {}},
    { total: 0, prekinds: {}}]
const seen = new Set()

/** @type {string[]} */
const files =
    // ['/home/nathansa/ts/tests/cases/user/prettier/prettier/node_modules/@angular/compiler/src/template_parser/template_parser.js']
    [
        ...sh.find('~/ts/tests/cases/user/acorn/**/*.js'),
        ...sh.find('~/ts/tests/cases/user/acorn/**/*.ts'),
        ...sh.find('~/ts/tests/cases/user/adonis-framework/**/*.js'),
        ...sh.find('~/ts/tests/cases/user/adonis-framework/**/*.ts'),
        ...sh.find('~/ts/tests/cases/user/ajv/**/*.js'),
        ...sh.find('~/ts/tests/cases/user/ajv/**/*.ts'),
        ...sh.find('~/ts/tests/cases/user/prettier/**/*.js'),
        ...sh.find('~/ts/tests/cases/user/prettier/**/*.ts'),
    ]
let declCount = 0
let signal = false
let post = ''
for (const filename of files) {
    const program = ts.createProgram([filename], { types: [], allowJs: true, checkJs: true })
    for (const f of program.getSourceFiles()) {
        const isdep = f.fileName.match(/\/node_modules\/(.+)/)
        const seenName = isdep ? isdep[1] : f.fileName
        if (seen.has(seenName)) {
            continue
        }
        seen.add(f.fileName)

        if (f && !/lib.+\.d\.ts/.test(f.fileName)) {
            walk(f)
        }
        readline.clearLine(process.stdout, /*left*/ -1)
        readline.cursorTo(process.stdout, 0, 0)
        readline.clearLine(process.stdout, /*left*/ 0)
        process.stdout.write(`(fs ${seen.size}/${files.length}) (decls ${declCount})\t` + f.fileName + '\n')
        process.stdout.write('[' + histogram.map((o, i) => i + ':' + o.total).join(',') + ']\n')
        process.stdout.write('{' + histogram.map(o => '[' + Object.keys(o.prekinds).join(',') + ']').join(',') + '}')
        if (signal) {
            post += f.fileName + '\n'
            signal = false
        }
        console.log(post)
        if (seen.size % 100) {
            fs.writeFileSync('./dumpPrejsdocs.json', JSON.stringify(histogram), 'utf8')
        }
    }
}

/**
 * @param {any} node
 * @returns {void}
 */
function walk(node) {
    const count = node.jsDoc && node.jsDoc.length || 0
    if (!histogram[count])
        histogram[count] = { total: 0, prekinds: {} }
    /** @type {string[][] | undefined} */
    const kindNamess = node.jsDoc && node.jsDoc.slice(0, node.jsDoc.length - 1).map(doc => doc.tags ? doc.tags.map(t => t.kind === ts.SyntaxKind.JSDocTag ? "tag" /*t.tagName.escapedText*/ : ts.SyntaxKind[t.kind]) : [])
    histogram[count].total += 1
    if (kindNamess) {
        for (const t of kindNamess) {
            for (const name of t) {
                if (name === "JSDocParameterTag" || name === "JSDocReturnTag") {
                    signal = true
                }
                histogram[count].prekinds[name] = (histogram[count].prekinds[name] || 0) + 1
            }
        }
    }
    if (ts.isDeclaration(node)) {
        declCount++
    }
    return ts.forEachChild(node, walk)
}

