const measure = require('./measure')
measure(
    '/home/nathansa/src/measure/errors.json',
    '/home/nathansa/src/measure/prs.json',
    '/home/nathansa/src/measure/repos.json',
    (ts, program) => ts.getPreEmitDiagnostics(program).length)
