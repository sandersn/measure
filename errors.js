const fs = require('fs')
const sh = require('shelljs')
const measure = require('./measure')
// read json
/** @type {Pr[]} NOTE: Reverse array to build better. */
const prs = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/prs.json', { encoding: "utf-8" })).reverse()
/** @type {string[]} */
const repos = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/repos.json', { encoding: "utf-8" }))

/**
 * @param {number} i - HACK: Skip async from PRs 22-27 when async never completed
 * @param {string} commit */
function countErrors(i, commit) {
    measure.rebuild(commit)
    return measure.compile(repos, (ts, program) => {
        if (program.getRootFileNames()[0].startsWith('/home/nathansa/ts/tests/cases/user/async') && 22 <= i && i <= 27) return null
        let errors = []
        let start = Date.now()
        try {
            errors = ts.getPreEmitDiagnostics(program)
        }
        catch (ex) {
            console.log('         failed to compile:')
            console.log(ex)
            return null
        }
        return errors.length
    });
}

/**
 * @param {Count[]} previous
 */
function main(previous) {
    const alreadyRun = previous.length
    const errors = previous
    let i = 0
    for (const pr of prs) {
        i++
        if (i <= alreadyRun) {
            console.log(`Already ran ${pr.number} (${i}), skipping.`)
            continue
        }
        errors.push({
            date: pr.date,
            number: pr.number,
            before: { sha: pr.sha, repos: countErrors(i, pr.sha) },
            after: { sha: pr.parentSha, repos: countErrors(i, pr.parentSha) }
        })
        console.log(`*** DONE: ${i} of ${prs.length} **************`)
        fs.writeFileSync('errors.json', JSON.stringify(errors))
    }
}

main(JSON.parse(fs.readFileSync('/home/nathansa/src/measure/errors.json', { encoding: "utf-8" })))
