const fs = require('fs')
const sh = require('shelljs')
const cp = require('child_process')
const path = require('path')
const vm = require('vm')

const ts = require('./TypeScript/built/local/typescript')
const { read, countAnys } = require('./measure')

function getCommit() {
    sh.pushd('./TypeScript')
    const commit = sh.exec('git log -1 --format=%H').stdout.trimRight()
    const subject = sh.exec('git log -1 --format=%s').stdout.trimRight()
    const date = sh.exec('git log -1 --format=%ad').stdout.trimRight()
    sh.exec('gulp')
    sh.popd()
    return { commit, subject, date }
}

/**
 * Shamelessly copied from TypeScript/src/harness/externalTestRunner.ts, then somewhat simplified.
 * @param {string} repo */
function resetUserTest(repo) {
    let cwd = `../TypeScript/tests/cases/user/${repo}`
    const directoryName = repo
    const timeout = 600000
    const stdio = "inherit"
    if (fs.existsSync(path.join(cwd, "test.json"))) {
        const submoduleDir = path.join(cwd, directoryName)
        const reset = cp.spawnSync("git", ["reset", "HEAD", "--hard"], { cwd: submoduleDir, timeout, shell: true, stdio })
        if (reset.status !== 0) throw new Error(`git reset for ${directoryName} failed: ${reset.stderr.toString()}`)
        const clean = cp.spawnSync("git", ["clean", "-f"], { cwd: submoduleDir, timeout, shell: true, stdio })
        if (clean.status !== 0) throw new Error(`git clean for ${directoryName} failed: ${clean.stderr.toString()}`)
        const pull = cp.spawnSync("git", ["pull", "-f"], { cwd: submoduleDir })
        if (pull.status !== 0) throw new Error(`git pull ${directoryName} failed: ${pull.stderr.toString()}`)

        cwd = submoduleDir
    }
    if (fs.existsSync(path.join(cwd, "package.json"))) {
        if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
            fs.unlinkSync(path.join(cwd, "package-lock.json"))
        }
        if (fs.existsSync(path.join(cwd, "node_modules"))) {
            sh.rm('-rf', path.join(cwd, "node_modules"))
        }
        const install = cp.spawnSync(`npm`, ["i", "--ignore-scripts"], { cwd, timeout: timeout / 2, shell: true, stdio })
        if (install.status !== 0) throw new Error(`NPM Install for ${directoryName} failed: ${install.stderr.toString()}`)
    }
}

/**
 * compile and get+count errors
 * @param {string[]} repos
 * @return {{ commit: string, count: RefactorCount }}
 */
function codeFix(repos) {
    const { commit, subject, date } = getCommit()

    /** @type {BeforeAfter} */
    const anys = {}
    /** @type {BeforeAfter} */
    const errors = {}
    for (const repo of repos) {
        resetUserTest(repo)
        console.log(' - ' + repo)
        // chrome-devtools-frontend is too big to refactorAll
        if (repo === 'chrome-devtools-frontend') {
            continue
        }
        const path = fs.existsSync(`./TypeScript/tests/cases/user/${repo}/tsconfig.json`) ?
            `./TypeScript/tests/cases/user/${repo}/` :
            `./TypeScript/tests/cases/user/${repo}/${repo}/`
        const config = ts.parseJsonSourceFileConfigFileContent(
            ts.readJsonConfigFile(path + 'tsconfig.json', fn => fs.readFileSync(fn, { encoding: "utf-8" })),
            ts.sys,
            path)
        config.options.noImplicitAny = false
        /** @type {Object<string, { version: number }>} */
        const files = {}
        config.fileNames.forEach(fn => files[fn] = { version: 0 })
        /** @type {ts.LanguageServiceHost} */
        const servicesHost = {
            getScriptFileNames: () => config.fileNames,
            getScriptVersion: fn => files[fn] && files[fn].version.toString(),
            getScriptSnapshot: fn => fs.existsSync(fn) ? ts.ScriptSnapshot.fromString(fs.readFileSync(fn, 'utf-8')) : undefined,
            getCurrentDirectory: process.cwd,
            getCompilationSettings: () => config.options,
            getDefaultLibFileName: ts.getDefaultLibFilePath,
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
            readDirectory: ts.sys.readDirectory
        }
        const service = ts.createLanguageService(servicesHost, ts.createDocumentRegistry())

        const program = ts.createProgram(config.fileNames, config.options)
        // (1) count (2) do refactoring (3) count again
        // NOTE: Make sure to run a baseline version that is supposed to have the exact same counts
        // before and after. The refactor probably doesn't work well enough to actually make this happen!
        const [beforeAnys, beforeErrors] = countErrorsAndAnys(ts, program)
        console.log(`  { beforeAnys: ${beforeAnys}, beforeErrors: ${beforeErrors} }`)

        /** @type {any} */
        const privateTs = ts
        for (const file of program.getRootFileNames()) {
            const sourceFile = program.getSourceFile(file)
            if (sourceFile) {
                try {
                    const { changes } = service.getCombinedCodeFix({ type: "file", fileName: file }, "inferFromUsage", {}, {})
                    for (const change of changes) {
                        const oldText = fs.readFileSync(file, 'utf-8')
                        const newText = privateTs.textChanges.applyChanges(oldText, change.textChanges)
                        if (oldText !== newText) {
                            console.log(`changed ${file}; length ${oldText.length} -> ${newText.length}`)
                        }
                        fs.writeFileSync(file, newText)
                    }
                }
                catch (e) {
                    console.log(file + "FAILED" + e.toString())
                }
            }
            else {
                throw new Error("couldn't find " + file)
            }
        }


        const [afterAnys, afterErrors] = countErrorsAndAnys(ts, ts.createProgram(config.fileNames, config.options))
        console.log(`  { afterAnys: ${afterAnys}, afterErrors: ${afterErrors} }`)
        anys[repo] = [beforeAnys, afterAnys]
        errors[repo] = [beforeErrors, afterErrors]
    }
    return { commit, count: {subject, date, anys, errors}}
}

/**
 * @param {ts} ts
 * @param {ts.Program} program
 * @return {[number, number]}
 */
function countErrorsAndAnys(ts, program) {
    return [/** @type {*} */(countAnys)(ts, program), ts.getPreEmitDiagnostics(program).length]
}

function main() {
    /** @type {Refactors} */
    const diffs = read('./diffs.json')
    const result = codeFix(read('./repos.json'))
    diffs[result.commit] = result.count
    fs.writeFileSync('./diffs.json', JSON.stringify(diffs))
}

main()
