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
        const config = ts.parseJsonSourceFileConfigFileContent(
            ts.readJsonConfigFile(`/home/nathansa/ts/tests/cases/user/${repo}/tsconfig.json`,
                                  fn => fs.readFileSync(fn, { encoding: "utf-8" })),
            ts.sys,
            `/home/nathansa/ts/tests/cases/user/${repo}/`)
        const program = ts.createProgram(config.fileNames, config.options)
        const count = getCount(ts, program)
        console.log(`  (${count})`)
        counts.push({ repo, count })
    }
    return counts
}


module.exports = {
    rebuild,
    compile,
}
