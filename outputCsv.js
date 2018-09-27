const fs = require('fs')
const { read } = require('./measure')
/** @type {Count[]} */
// const errors = read('./errors.json')
/** @type {Count[]} */
const anys = read('./anys.json')
/** @type {string[]} */
const repos = read('./repos.json')

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
writeCsv(afters(anys))
