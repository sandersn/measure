// for #43677 which fixes #43534

const fs = require('fs')
// const tslines = fs.readFileSync('./ts-typedefs.txt', 'utf8').split('\n')
const jslines = fs.readFileSync('./js-typedefs.txt', 'utf8').split('\n')
// console.log(tslines.length)
console.log(jslines.length)
const js = stats(jslines)
console.log({ ...js, other: js.other.length })
fs.writeFileSync('./typedefs.txt', js.other.join('\n'))
// console.log(stats(jslines))
/** @param {string[]} lines */
function stats(lines) {
    let errors = 0
    let variants = 0
    let singleTypedefs = 0
    let allTypedefs = 0
    let protobuf = 0
    let other = []
    for (const line of lines) {
        const tags = parseTags(line)
        if (line.includes('protobuf'))
            protobuf++
        else if (tags.length === 0)
            errors++
        else if (tags.length === 1 && tags[0] === 'typedef')
            singleTypedefs++
        else if (tags.every(t => t === 'typedef'))
            allTypedefs++
        else if (tags.every(t => t === 'typedef' || t === 'template' || t === 'deprecated' || t === 'memberOf' || t === 'memberof' || t === 'property' || t === 'summary' || t === 'desc' || t === 'description' || t === 'example'))
            variants++
        else
            other.push(line)
    }
    return {
        errors,
        singleTypedefs,
        allTypedefs,
        variants,
        protobuf,
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
