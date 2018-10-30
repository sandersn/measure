const fs = require('fs')
const { read } = require('./measure')
/** @type {Count[]} */
// const errors = read('./errors.json')
/** @type {Count[]} */
const anys = read('./anys.json')
/** @type {string[]} */
const repos = read('./repos.json')
/** @type {Refactors} */
const refactors = read('./diffs.json')

/**
 * @template T,U,V
 * @param {(t: T, u: U) => V} f
 * @param {T[]} l1
 * @param {U[]} l2
 * @returns {V[]}
 */
function zipWith(l1, l2, f) {
    if (l1.length !== l2.length) {
        throw new Error('length mismatch')
    }
    const vs = []
    for (let i = 0; i < l1.length; i++) {
        vs.push(f(l1[i], l2[i]))
    }
    return vs
}

/**
 * @param {Count[]} counts
 * @param {(count: Count) => (number | string | null)[]} counter
 */
function tableau(counts, counter) {
    return [[null, ...repos], // header
            ...counts.map(count => [count.number, ...counter(count)])]
}

/** @param {Count[]} counts */
function afters(counts) {
    return tableau(counts, count => count.after.repos.map(r => r.count))
}
/** @param {Count[]} counts */
function diffs(counts) {
    return tableau(counts, count => zipWith(count.before.repos.map(r => r.count), count.after.repos.map(r => r.count), (n,m) => n == null || m == null ? null : n - m))
}
/** @param {(number | string | null)[][]} rows */
function writeCsv(rows) {
    for (const row of rows) {
        console.log(row.join(','))
    }
}
writeCsv(diffs2(refactors))

/** @param {Refactors} refactors */
function diffs2(refactors) {
    // produce one row per repo plus a header, twice:
    // 1. header (repos)
    // 2. before-anys
    // 3. after-anys
    // 4. before-errors
    // 5. after-errors3. after-anys
    // 4. before-errors
    // 5. after-errors
    let rs = repos.filter(r => r !== 'chrome-devtools-frontend')
    const acc = []
    acc.push(['ANYS'])
    acc.push(['', ...Object.keys(refactors).map(commit => refactors[commit].subject)])
    for (const r of rs) {
        const row = [r]
        for (const commit in refactors) {
            const [before, after] = refactors[commit].anys[r]
            if (before === 0) {
                console.log(r, commit, 'had no anys!')
                continue
            }
            row.push('' + ((before - after) / before))
        }
        acc.push(row)
    }
    acc.push(['', ...Object.keys(refactors).map(_ => '')])
    acc.push(['ERRORS'])

    acc.push(['', ...Object.keys(refactors).map(commit => refactors[commit].subject)])
    for (const r of rs) {
        const row = [r]
        for (const commit in refactors) {
            const [before, after] = refactors[commit].errors[r]
            if (before === 0) {
                console.log(r, commit, 'had no errors.')
                continue
            }
            row.push('' + (before - after))
        }
        acc.push(row)
    }
    return acc
}
