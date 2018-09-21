const fs = require('fs')
const sh = require('shelljs')
/** @typedef {{ date: string, number: number, sha: string, parentSha: string }} Pr */

/** @param {string} commit */
function rebuild(commit) {
    sh.pushd('./TypeScript')
    // checkout commit
    sh.exec('git checkout ' + commit)
    // re-build
    sh.exec('npm install')
    sh.exec('jake clean')
    sh.exec('jake')
    sh.popd()
    console.log(first)
    return compile()
}
// compile and get+count errors
function compile() {
    let ts = require('./TypeScript/built/local/typescript')
    const counts = []
    for (const repo of repos) {
        console.log('Compiling ' + repo)
        const config = ts.parseJsonSourceFileConfigFileContent(
            ts.readJsonConfigFile(`/home/nathansa/ts/tests/cases/user/${repo}/tsconfig.json`,
                                  fn => fs.readFileSync(fn, { encoding: "utf-8" })),
            ts.sys,
            `/home/nathansa/ts/tests/cases/user/${repo}/`)
        /** @type {ts.Diagnostic[]} */
        let errors = []
        try {
            errors = ts.getPreEmitDiagnostics(ts.createProgram(config.fileNames, config.options))
        }
        catch (ex) {
            console.log(repo + ' failed to compile.')
            counts.push({ repo, count: null })
            continue
        }
        counts.push({ repo, count: errors.length })
    }
    return counts
    // for (const err of errors) {
    //     console.log(err.messageText)
    // }
}

// read json
// reverse array to build better
/** @type {Pr[]} */
const prs = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/prs.json', { encoding: "utf-8" })).reverse()
/** @type {string[]} */
const repos = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/repos.json', { encoding: "utf-8" }))
// TODO: Do this for all PRs and write out a new json file
const first = prs[0]
const errorCounts = rebuild(first.sha)
const parentErrorCounts = rebuild(first.parentSha)
console.log(`Difference: ${parentErrorCounts[1].count - errorCounts[1].count}`);
console.log(errorCounts)

// checkout parent commit
// compiler and get+count errors
// output difference in errors

