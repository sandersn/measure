const ts = require('typescript')
const fs = require('fs')
const sh = require('shelljs')
const cp = require('child_process')
const path = require('path')
const vm = require('vm')
const { read, countAnys } = require('./measure')

function getCommit() {
    sh.pushd('./TypeScript')
    const commit = sh.exec('git log -1 --format=%H').stdout.trimRight()
    const date = sh.exec('git log -1 --format=%ad').stdout.trimRight()
    sh.exec('jake')
    sh.popd()
    return { commit, date }
}

/**
 * Shamelessly copied from TypeScript/src/harness/externalTestRunner.ts, then somewhat simplified.
 * @param {string} repo */
function resetUserTest(repo) {
    let cwd = `/home/nathansa/TypeScript/tests/cases/user/${repo}`
    const directoryName = repo
    const timeout = 600000
    const stdio = "inherit"
    /** @type {string[] | undefined} */
    let types
    if (fs.existsSync(path.join(cwd, "test.json"))) {
        const submoduleDir = path.join(cwd, directoryName)
        const reset = cp.spawnSync("git", ["reset", "HEAD", "--hard"], { cwd: submoduleDir, timeout, shell: true, stdio })
        if (reset.status !== 0) throw new Error(`git reset for ${directoryName} failed: ${reset.stderr.toString()}`)
        const clean = cp.spawnSync("git", ["clean", "-f"], { cwd: submoduleDir, timeout, shell: true, stdio })
        if (clean.status !== 0) throw new Error(`git clean for ${directoryName} failed: ${clean.stderr.toString()}`)
        const update = cp.spawnSync("git", ["submodule", "update", "--init", "--remote", "."], { cwd: submoduleDir, timeout, shell: true, stdio })
        if (update.status !== 0) throw new Error(`git submodule update for ${directoryName} failed: ${update.stderr.toString()}`)

        /** @type {{ types: string[] }} */
        const config = JSON.parse(fs.readFileSync(path.join(cwd, "test.json"), { encoding: "utf8" }))
        types = config.types

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

/** @typedef {[string, string, object, object]} CodeFixCount */

/**
 * compile and get+count errors
 * @param {string[]} repos
 * @param {(ts: typeof import('typescript'),
            program: import('typescript').Program) => [number, number]} getCount
 * @param {(ts: typeof import('typescript'),
            program: import('typescript').Program,
            service: import('typescript').LanguageService) => void} refactorAll
 * @return {[string, string, { [s: string]: [number, number] }, { [s: string]: [number, number] }]}
 */
function codeFix(repos, getCount, refactorAll) {
    const { commit, date } = getCommit()
    const src = fs.readFileSync('./TypeScript/built/local/typescript.js', "utf8")
    const wrappedSrc = `(function (module, exports, require, __filename, __dirname){${src}\n})`
    const wrapped = vm.runInThisContext(wrappedSrc)
    const module = /** @type {*} */({ exports: {} })
    wrapped(module, module.exports, require, './TypeScript/built/local/typescript.js', './TypeScript/built/local')
    /** @type {import('typescript')} */
    const ts = module.exports

    /** @type {{ [s: string]: [number, number] }} */
    const anys = {}
    /** @type {{ [s: string]: [number, number] }} */
    const errors = {}
    for (const repo of repos) {
        process.stdout.write(' - ' + repo)
        resetUserTest(repo)
        const path = fs.existsSync(`/home/nathansa/TypeScript/tests/cases/user/${repo}/tsconfig.json`) ?
            `/home/nathansa/TypeScript/tests/cases/user/${repo}/` :
            `/home/nathansa/TypeScript/tests/cases/user/${repo}/${repo}/`
        const config = ts.parseJsonSourceFileConfigFileContent(
            ts.readJsonConfigFile(path + 'tsconfig.json', fn => fs.readFileSync(fn, { encoding: "utf-8" })),
            ts.sys,
            path)
        config.options.noImplicitAny = true
        /** @type {Object<string, { version: number }>} */
        const files = {}
        config.fileNames.forEach(fn => files[fn] = { version: 0 })
        /** @type {import("typescript").LanguageServiceHost} */
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
        const [beforeAnys, beforeErrors] = getCount(ts, program)
        console.log(`  (${beforeAnys})`)
        refactorAll(ts, program, service)
        const [afterAnys, afterErrors] = getCount(ts, ts.createProgram(config.fileNames, config.options))
        console.log(`  (${afterAnys})`)
        anys[repo] = [beforeAnys, afterAnys]
        errors[repo] = [beforeErrors, afterErrors]
    }
    return [commit, date, anys, errors]
}

function main() {
    const diffs = read('./diffs.json')
    // TODO: Import counters from anys/errors.js
    // TODO: Save results somewhere (key should be current commit)
    const [commit, date, anys, errors] = codeFix(read('./repos.json'),
            (ts, program) => [countAnys(ts, program), ts.getPreEmitDiagnostics(program).length],
            (ts, program, service) => {
        /** @type {any} */
        const privateTs = ts
        for (const file of program.getRootFileNames()) {
            const sourceFile = program.getSourceFile(file)
            if (sourceFile) {
                const fixId = "inferFromUsage"
                const { changes, commands } = service.getCombinedCodeFix({ type: "file", fileName: file }, fixId, {}, {})
                for (const change of changes) {
                    const oldText = fs.readFileSync(file, 'utf-8')
                    const newText = privateTs.textChanges.applyChanges(oldText, change.textChanges)
                    fs.writeFileSync(file, newText)
                }
            }
            else {
                throw new Error("couldn't find " + file)
            }
        }
    })
    diffs[commit] = { date, anys, errors }
    fs.writeFileSync('./diffs.json', JSON.stringify(diffs))
}

main()