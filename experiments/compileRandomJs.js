const fs = require('fs')
const sh = require('shelljs')
const files = fs.readFileSync('./all-user-js.txt', 'utf8').split('\n')

for (let i = 0; i < 100; i++) {
    const index = Math.floor(Math.random() * files.length)
    console.log(`${i}:          ${files[index]}`)
    sh.exec('node ~/ts/built/local/tsc.js --allowjs --noemit --skiplibcheck ' + '~/ts/tests/cases/user/' + files[index])
}
