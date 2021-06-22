// for #43677 which fixes #43534
const fs = require('fs')
const tslines = fs.readFileSync('./ts-typedefs.txt', 'utf8').split('\n')
const jslines = fs.readFileSync('./js-typedefs.txt', 'utf8').split('\n')
console.log(tslines.length)
console.log(jslines.length)
console.log(stats(tslines))
// console.log(stats(jslines))
/** @param {string[]} lines */
function stats(lines) {
    let errors = 0
    let singleTypedefs = 0
    let allTypedefs = 0
    let other = [] // TODO: Just list these instead of counting
    for (const line of lines) {
        const tags = parseTags(line)
        if (tags.length === 0)
            errors++
        else if (tags.length === 1 && tags[0] === 'typedef')
            singleTypedefs++
        else if (tags.every(t => t === 'typedef'))
            allTypedefs++
        else
            other.push(line)
    }
    return {
        errors,
        singleTypedefs,
        allTypedefs,
        other
    }
}
/** @param {string} line */
function parseTags(line) {
    const l = line.indexOf('(')
    const r = line.indexOf(')')
    const tags = line.slice(l + 1, r).split(',')
    return tags
}
