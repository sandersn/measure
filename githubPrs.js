const fs = require('fs')
const sh = require('shelljs')
const Gh = require('@octokit/rest')
var gh = new Gh()
/** @typedef {{ date: string, number: number, sha: string, parentSha: string }} Pr */

async function main() {
    gh.authenticate({
        type: "token",
        token: fs.readFileSync('/home/nathansa/api.token', { encoding: 'utf-8' })
    })
    const rows = await all()
    fs.writeFileSync('/home/nathansa/src/measure/prs.json', JSON.stringify(rows))
}
/** @returns {Promise<Pr[]>} */
async function all() {
    sh.pushd('~/ts')
    let i = 0
    let rows = []
    for (var page = 1; page <= 2; page++) {
        const search = await gh.search.issues({
            q: "is:pr is:closed author:sandersn repo:Microsoft/TypeScript",
            sort: "updated",
            order: "desc",
            per_page: 100,
            page
        })
        for (const it of search.data.items) {
            const req = await gh.pullRequests.get({
                owner: "Microsoft",
                repo: "TypeScript",
                number: it.number
            })
            /** @type {Pr} */
            const row = {
                date: req.data.merged_at,
                number: it.number,
                sha: req.data.merge_commit_sha,
                parentSha: sh.exec('git log --pretty=%P -n 1 ' + req.data.merge_commit_sha).stdout.trimRight()
            }
            if (row.date != null && !row.parentSha.match(/ /))
                rows.push(row)
            console.log(JSON.stringify(row))
            // aim for #22449, last updated Jul 25 (???), but merged on Mar 9
            i++
            if (i > 166) break
        }
    }
    sh.popd()
    return rows
}
main()
