const fs = require('fs')
const sh = require('shelljs')
const measure = require('./measure')
// read json
/** @type {Pr[]} NOTE: Reverse array to build better. */
const prs = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/prs.json', { encoding: "utf-8" })).reverse()
/** @type {string[]} */
const repos = JSON.parse(fs.readFileSync('/home/nathansa/src/measure/repos.json', { encoding: "utf-8" }))

/** @param {string} commit */
function countErrors(commit) {
    measure.rebuild(commit)
    return measure.compile(repos, (ts, program) => {
        let errors = []
        let start = Date.now()
        try {
            errors = ts.getPreEmitDiagnostics(program, undefined, {
                isCancellationRequested() {
                    return Date.now() - start > 60000;
                },
                throwIfCancellationRequested() {
                    if (this.isCancellationRequested()) {
                        throw new Error("Compilation timed out")
                    }
                }
            })
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
            before: { sha: pr.sha, repos: countErrors(pr.sha) },
            after: { sha: pr.parentSha, repos: countErrors(pr.parentSha) }
        })
        console.log(`*** DONE: ${i} of ${prs.length} **************`)
        fs.writeFileSync('errors.json', JSON.stringify(errors))
    }
}

main(JSON.parse(fs.readFileSync('/home/nathansa/src/measure/errors.json', { encoding: "utf-8" })))
