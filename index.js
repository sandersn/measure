const fs = require('fs')
const Gh = require('@octokit/rest')
var gh = new Gh()
async function main() {
    gh.authenticate({
        type: "token",
        token: fs.readFileSync('/home/nathansa/api.token', { encoding: 'utf-8' })
    });
    const search = await gh.search.issues({
        q: "is:pr author:sandersn"
    })
    // console.log(search.data.items[0])
    const res = await gh.pullRequests.get({
        owner: 'Microsoft',
        repo: "Microsoft/TypeScript",
        number: search.data.items[0].number,
    })
    console.log(res)
}
main()
