const fs = require('fs')
const vm = require("vm")
const process = require('process')
const sh = require('shelljs')

/**
 * @param {string} commit
 * @return {void}
 */
function rebuild(commit) {
    sh.pushd('./TypeScript')
    sh.exec('git checkout -- package-lock.json')
    // checkout commit
    sh.exec('git checkout ' + commit)
    // re-build
    sh.exec('npm install')
    sh.exec('jake clean')
    sh.exec('jake')
    sh.popd()
}

/**
 * compile and get+count errors
 * @param {string[]} repos
 * @param {(ts: typeof import('./TypeScript/built/local/typescript'),
            program: import('./TypeScript/built/local/typescript').Program) => number | null} getCount
 * @return {TestCount[]}
 */
function compile(repos, getCount) {
    const src = fs.readFileSync('./TypeScript/built/local/typescript.js', "utf8")
    const wrappedSrc = `(function (module, exports, require, __filename, __dirname){${src}\n})`
    const wrapped = vm.runInThisContext(wrappedSrc)
    const module = /** @type {*} */({ exports: {} })
    wrapped(module, module.exports, require, './TypeScript/built/local/typescript.js', './TypeScript/built/local');
    /** @type {import('./TypeScript/built/local/typescript')} */
    const ts = module.exports;

    const counts = []
    for (const repo of repos) {
        process.stdout.write(' - ' + repo)
        const path = fs.existsSync(`/home/nathansa/ts/tests/cases/user/${repo}/tsconfig.json`) ?
            `/home/nathansa/ts/tests/cases/user/${repo}/` :
            `/home/nathansa/ts/tests/cases/user/${repo}/${repo}/`
        const config = ts.parseJsonSourceFileConfigFileContent(
            ts.readJsonConfigFile(path + 'tsconfig.json', fn => fs.readFileSync(fn, { encoding: "utf-8" })),
            ts.sys,
            path)
        const program = ts.createProgram(config.fileNames, config.options)
        const count = getCount(ts, program)
        console.log(`  (${count})`)
        counts.push({ repo, count })
    }
    return counts
}

/** @param {string} path */
function read(path) {
    return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }))
}

/**
 * @param {string} commit
 * @param {(ts: typeof import('./TypeScript/built/local/typescript'),
            program: import('./TypeScript/built/local/typescript').Program) => number} getCount
 * @param {string[]} repos
 * @param {number} i - HACK: Skip async from PRs 22-27 when async never completed
 */
function count(commit, getCount, repos, i) {
    rebuild(commit)
    return compile(repos, (ts, program) => {
        if (program.getRootFileNames()[0].startsWith('/home/nathansa/ts/tests/cases/user/async') && 22 <= i && i <= 27) return null
        /** @type {number | null} */
        let start = Date.now()
        try {
            return getCount(ts, program)
        }
        catch (ex) {
            console.log(' failed to compile:')
            console.log(ex)
            return null
        }
    });
}

/**
 * @param {string} previousPath
 * @param {string} prPath
 * @param {string} repoPath
 * @param {(ts: typeof import('./TypeScript/built/local/typescript'),
            program: import('./TypeScript/built/local/typescript').Program) => number} getCount
 */
function run(previousPath, prPath, repoPath, getCount) {
    /** @type {Pr[]} */
    const prs = read(prPath).reverse()
    /** @type {string[]} */
    const repos = read(repoPath)
    /** @type {Count[]} */
    const previous = read(previousPath)
    const alreadyRun = previous.length
    const errors = previous
    let i = 0
    for (const pr of prs) {
        i++
        if (i <= alreadyRun) {
            console.log(`Already ran ${pr.number} (${i}), skipping.`)
            continue
        }
        if (i === 39) {
            console.log(`PR 39 doesn't build, skipping.`)
            errors.push({
                date: pr.date,
                number: pr.number,
                after: { sha: pr.parentSha, repos: repos.map(repo => ({ repo, count: null })) },
                before: { sha: pr.sha, repos: repos.map(repo => ({ repo, count: null })) },
            })
            continue
        }
        errors.push({
            date: pr.date,
            number: pr.number,
            after: { sha: pr.parentSha, repos: count(pr.parentSha, getCount, repos, i) },
            before: { sha: pr.sha, repos: count(pr.sha, getCount, repos, i) },
        })
        console.log(`*** DONE: ${i} of ${prs.length} ***************************************************`)
        fs.writeFileSync('errors.json', JSON.stringify(errors))
    }
}

module.exports = run
