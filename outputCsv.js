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
    let beforeSum = 0
    const acc = [['ANYS']]
    acc.push(['', 'BEFORE', ...Object.keys(refactors).map(commit => refactors[commit].subject)])
    for (const r of rs) {
        let first = true
        const row = [r]
        for (const commit in refactors) {
            const [before, after] = refactors[commit].anys[r]
            if (first) {
                beforeSum += before
                row.push('' + before)
                first = false
            }
            row.push('' + after)
        }
        acc.push(row)
    }
    const sums = []
    for (const commit in refactors) {
        let sum = 0
        for (const r in refactors[commit].anys) {
            sum += refactors[commit].anys[r][1]
        }
        sums.push(sum)
    }
    acc.push(["TOTAL", '' + beforeSum, ...sums.map(n => '' + n)])
    acc.push(["TOTAL%", '1.0', ...sums.map(n => '' + (n / beforeSum))])

    acc.push([''])
    acc.push(['ERRORS'])

    acc.push(['', ...Object.keys(refactors).map(commit => refactors[commit].subject)])
    for (const r of rs) {
        const row = [r]
        for (const commit in refactors) {
            const [before, after] = refactors[commit].errors[r]
            row.push('' + (before - after))
        }
        acc.push(row)
    }

    return acc
}
