/** @typedef {string} ProjectName */
/** @typedef {string} FileName */
/** @typedef {string} Content */
/** @typedef {Map<ProjectName, Map<FileName, Set<Content>>>} Projects */


const fs = require('fs')
const original = fs.readFileSync('allrefs.txt', 'utf8').split('\n')
const lines = /** @type {string[]} */(original.map(cleanup).filter(Boolean))
const projects = makeProjects(lines)

/** @param {string[]} lines */
function makeProjects(lines) {
    /** @type {Projects} */
    const projects = new Map()
    let projectname = ''
    /** @type {Map<FileName, Set<Content>>} */
    let project = new Map()
    /** @type {Set<Content>} */
    let lineset = new Set()
    let filename = ''
    let skip = false
    for (const line of lines) {
        const [ newp, newf ] = projectFile(line)
        if (newp !== projectname) {
            projectname = newp
            filename = ''
            if (!projects.has(projectname)) {
                projects.set(projectname, new Map())
            }
            project = projects.get(projectname) || new Map()
        }
        if (filename !== newf) {
            filename = newf
            if (project.has(filename)) {
                // already seen; skip past all lines with this filename
                skip = true
            } else {
                project.set(filename, new Set())
                skip = false
            }
            lineset = project.get(filename) || new Set()
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
        for (const [filename, file] of project) {
            for (const line of file) {
                acc.push([projectname, filename, line].join(' '))
            }
        }
    }
    return acc
}

fs.writeFileSync('allprojects.txt', flatten(projects).join('\n'))

/** @param {string} line */
function projectFile(line) {
    const modules = line.match(/node_modules\/(@\w+\/[^\/]+|[^\/]+)/g)
    if (modules) {
        const last = modules[modules.length - 1]
        return [last.slice(13), line.slice(line.lastIndexOf(last) + last.length + 1, line.indexOf(':'))]
    } else {
        return [line.slice(2, line.indexOf('/', 3)), line.slice(line.indexOf('/', 3) + 1, line.indexOf(':'))]
    }
}
/** @param {string} line */
function cleanup(line) {
    return line.length < 500
        && !line.includes('http') // not an entity reference
        && line.indexOf('@link') !== line.length - 5 // incomplete @link tag
        && !line.endsWith('@see') // incomplete @see tag
        && line
}
