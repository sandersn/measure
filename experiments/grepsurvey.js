/** @typedef {string} ProjectName */
/** @typedef {string} FileName */
/** @typedef {string} Content */
/** @typedef {Map<ProjectName, { nested: boolean, files: Map<FileName, Set<Content>> }>} Projects */

// here's a good grep
// find . -name '*.ts' | xargs grep '@return' | cut -c1-200 >~/src/measure/experiments/user-ts-return.txt

const fs = require('fs')
const original = fs.readFileSync('defineproperties.txt', 'utf8').split('\n')
const lines = /** @type {string[]} */(original.map(cleanup).filter(Boolean))
const projects = makeProjects(lines)
fs.writeFileSync('allprojects.txt', flatten(projects).join('\n'))


/** @param {string[]} lines */
function makeProjects(lines) {
    /** @type {Projects} */
    const projects = new Map()
    let projectname = ''
    /** @type {{ nested: boolean, files: Map<FileName, Set<Content>> }} */
    let project = { nested: true, files: new Map() }
    /** @type {Set<Content>} */
    let lineset = new Set()
    let filename = ''
    let skip = false
    for (const line of lines) {
        const [ newp, newf, nested ] = projectFile(line)
        if (newp !== projectname) {
            projectname = newp
            filename = ''
            if (!projects.has(projectname) || (!nested && projects.get(projectname).nested)) {
                projects.set(projectname, { nested, files: new Map() })
            }
            project = projects.get(projectname) || { nested, files: new Map() }
        }
        if (filename !== newf) {
            filename = newf
            if (project.files.has(filename)) {
                // already seen; skip past all lines with this filename
                skip = true
            } else {
                project.files.set(filename, new Set())
                skip = false
            }
            lineset = project.files.get(filename) || new Set()
        }
        if (!skip) {
            lineset.add(line.slice(line.indexOf(":") + 1))
        }
    }
    return projects
}
/** @param {Projects} projects */
function flatten(projects) {
    const acc = []
    for (const [projectname,project] of projects) {
        for (const [filename, file] of project.files) {
            const identifiers = Array.from(file).map(line => line.slice(0, line.indexOf(' = require')))
            const dupes = new Set(identifiers.filter(id => identifiers.indexOf(id) === identifiers.lastIndexOf(id)))
            for (const line of file) {
                if (dupes.has(line.slice(0, line.indexOf(' = require'))))
                    acc.push([projectname, filename, line].join(' '))
            }
        }
    }
    return acc
}


/** @param {string} line
 * @return {[string,string,boolean]} */
function projectFile(line) {
    const modules = line.match(/node_modules\/(@\w+\/[^\/]+|[^\/]+)/g)
    if (modules) {
        const last = modules[modules.length - 1]
        return [last.slice(13), line.slice(line.lastIndexOf(last) + last.length + 1, line.indexOf(':')), true]
    } else {
        return [line.slice(2, line.indexOf('/', 3)), line.slice(line.indexOf('/', 3) + 1, line.indexOf(':')), false]
    }
}
/** @param {string} line */
function cleanup(line) {
    return line.length < 500
        // && !line.includes('http') // not an entity reference
        // && line.indexOf('@link') !== line.length - 5 // incomplete @link tag
        // && !line.endsWith('@see') // incomplete @see tag
        && line
}
