const readline = require('readline')
const sh = require('shelljs')
const path = require('path')
const dtPath = path.resolve("../../../DefinitelyTyped/types/")
const fs = require('fs')
const process = require('process')
const ts = require('typescript')


const histogram = [0, 0, 0, 0, 0, 0]
const deps = new Set()

process.chdir(dtPath)
for (const dir of fs.readdirSync(dtPath)) {
    for (const f of sh.find(dir).filter(f => f.endsWith('.d.ts'))) {
        // skip repeated dependencies
        // 1. because it's slow (aws-sdk specifically)
        // 2. because it makes the counts wrong
        const isdep = f.match(/\/node_modules\/(.+)/)
        if (isdep) {
            if (deps.has(isdep[1])) {
                continue
            }
            else {
                deps.add(isdep[1])
            }
        }
        const program = ts.createProgram([f], { types: [] })
        for (const f of program.getSourceFiles()) {
            if (f && f.fileName.endsWith('.d.ts') && !/lib.+\.d\.ts/.test(f.fileName) && f.fileName.indexOf('DefinitelyTyped/node_modules/@types/node/') === -1) {
                walk(f)
            }
            readline.clearLine(process.stdout, /*left*/ -1)
            readline.cursorTo(process.stdout, 0)
            process.stdout.write('[' + histogram.map((n, i) => i + ':' + n).join(',') + ']\t' + f.fileName)
        }
    }
}
/**
 * @param {ts.Node} parent
 * @returns {ts.FunctionDeclaration[][]}
 */
function groupOverloads(parent) {
    /** @type {ts.FunctionDeclaration[][]} */
    const overloads = []
    /** @type {ts.__String | undefined} */
    let current = undefined
    parent.forEachChild(n => {
        if (ts.isFunctionDeclaration(n) && n.name) {
            if (!current || current !== n.name.escapedText) {
                overloads.push([])
                current = n.name.escapedText
            }
            overloads[overloads.length - 1].push(n)
        }
    })
    return overloads
}

/**
 * @param {ts.Node} node
 * @returns {void}
 */
function walk(node) {
        for (const overloadset of groupOverloads(node)) {
            histogram[overloadset.length] = (histogram[overloadset.length] || 0) + 1
        }
    return ts.forEachChild(node, walk)
}

