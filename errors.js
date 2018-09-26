const measure = require('./measure')
measure(
    './errors.json',
    './prs.json',
    './repos.json',
    (ts, program) => ts.getPreEmitDiagnostics(program).length)
