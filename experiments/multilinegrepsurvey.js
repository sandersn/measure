// Usage (because I don't feel like using shelljs I guess)
// node astsurvey.js file1.ts file2.js file3.d.ts
// or more likely:
// find . -iname '*.js' | xargs node astsurvey.js
// TODO: This could be MUCH faster by searching for 'require', then
// walking up the tree a bit to see if the containing structure matches
// const ts = require('typescript')
const fs = require('fs')
// console.error(process.argv.slice(2).length)
let i = 0
let j = 0
// let k = 0
for (const file of process.argv.slice(2)) {
    let source = ''
    try {
        source = fs.readFileSync(file, 'utf8')
    } catch (e) {
        // console.error(e.toString())
        continue
    }
    const m = source.match(/@param.+?\*\//gs)
    if (m) {
        i++
        if(m[0].indexOf('@return') === -1) {
            j++
        }
        // if(m[0].indexOf('@return') !== -1) {
        //     k++
        // }
    }
}
console.log(i, j)
