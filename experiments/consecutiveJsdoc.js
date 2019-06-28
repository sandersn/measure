const readline = require('readline')
const fs = require('fs')
const process = require('process')
const ts = require('typescript')

const histogram = [0, 0, 0, 0, 0, 0]
const seen = new Set()

/** @type {string[]} */
const files = JSON.parse(fs.readFileSync('./files.json'))
for (const filename of files) {
    const program = ts.createProgram([filename], { types: [], allowJs: true })
    for (const f of program.getSourceFiles()) {
        if (seen.has(f.fileName)) {
            continue
        }
        seen.add(f.fileName)

        if (f && !/lib.+\.d\.ts/.test(f.fileName)) {
            console.log(filename, f.fileName)
            walk(f)
        }
        readline.clearLine(process.stdout, /*left*/ -1)
        readline.cursorTo(process.stdout, 0, 0)
        readline.clearLine(process.stdout, /*left*/ 0)
        process.stdout.write(f.fileName + '\n')
        process.stdout.write('[' + histogram.map((n, i) => i + ':' + n).join(',') + ']')
    }
}

/**
 * @param {any} node
 * @returns {void}
 */
function walk(node) {
    if (node.jsDoc && node.jsDoc.length) {
        histogram[node.jsDoc.length] = (histogram[node.jsDoc.length] || 0) + 1
    }
    return ts.forEachChild(node, walk)
}

