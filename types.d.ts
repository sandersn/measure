interface Pr {
    date: string,
    number: number,
    sha: string,
    parentSha: string
}
interface TestCount {
    repo: string,
    count: number | null
}
interface Count {
    date: string,
    number: number,
    before: { sha: string, repos: TestCount[] },
    after: { sha: string, repos: TestCount[] }
}

