const fs = require('fs')
const sh = require('shelljs')
const measure = require('./measure')
// read json
/** @type {Pr[]} NOTE: Reverse array to build better. */
const prs = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/prs.json', { encoding: "utf-8" })).reverse()
/** @type {string[]} */
const repos = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/repos.json', { encoding: "utf-8" }))

/** @type {(ts: typeof import('typescript'),
            program: import('typescript').Program) => number | null} */
function test(ts, program) {
    let errors = []
    let count = 0
    const checker = program.getTypeChecker()
    const privateTs = /** @type {*} I KNOW what I'm doing */(ts)
    /**

     * @param {import('typescript').Node} node
     * @return {void}
     */
    const walk = function (node) {

        if ((privateTs.isExpressionNode(node) || node.kind === ts.SyntaxKind.Identifier || privateTs.isDeclarationName(node)) &&
            checker.getTypeAtLocation(node) === /** @type {*} */(checker).getAnyType()) {
            count++
        }
        return ts.forEachChild(node, walk)
    }
    try {
        for (const file of program.getRootFileNames()) {
            const sourceFile = program.getSourceFile(file)
            if (sourceFile) {
                walk(sourceFile)
            }
            else {
                console.log("couldn't find " + file)
            }
        }
    }
    catch (ex) {
        console.log('         failed to compile:')
        console.log(ex)
        return null
    }
    return count
}

const ts = require('typescript')
const config = ts.parseJsonSourceFileConfigFileContent(
    ts.readJsonConfigFile(`/home/nathansa/ts/tests/cases/user/async/tsconfig.json`,
                          fn => fs.readFileSync(fn, { encoding: "utf-8" })),
    ts.sys,
    `/home/nathansa/ts/tests/cases/user/async/`)
const program = ts.createProgram(config.fileNames, config.options)
console.log(test(ts, program))

// /** @param {string} commit */
// function countErrors(commit) {
//     measure.rebuild(commit)
//     return measure.compile(repos, (ts, program) => {
//         let errors = []
//         try {
//             errors = ts.getPreEmitDiagnostics(program)
//         }
//         catch (ex) {
//             console.log('failed to compile:')
//             console.log(ex)
//             return null
//         }
//         return errors.length
//     });
// }
// /**
//  * @param {Count[]} previous
//  */
// function main(previous) {
//     const alreadyRun = previous.length
//     const errors = previous
//     let i = 0
//     for (const pr of prs) {
//         i++
//         if (i <= alreadyRun) {
//             console.log(`Already ran ${pr.number} (${i}), skipping.`)
//             continue
//         }
//         errors.push({
//             date: pr.date,
//             number: pr.number,
//             before: { sha: pr.sha, repos: countErrors(pr.sha) },
//             after: { sha: pr.parentSha, repos: countErrors(pr.parentSha) }
//         })
//         console.log(`*** DONE: ${i} of ${prs.length} **************`)
//         fs.writeFileSync('errors.json', JSON.stringify(errors))
//     }
// }

// main(JSON.parse(fs.readFileSync('/home/nathansa/src/measure/errors.json', { encoding: "utf-8" })))
