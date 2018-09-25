const measure = require('./measure')
measure(
    '/home/nathansa/src/measure/anys.json',
    '/home/nathansa/src/measure/prs.json',
    '/home/nathansa/src/measure/repos.json',
    (ts, program) => {
        let count = 0
        const checker = program.getTypeChecker()
        const privateTs = /** @type {*} I KNOW what I'm doing */(ts)
        /**
         * @param {import('./TypeScript/built/local/typescript').Node} node
         * @return {void}
         */
        const walk = function (node) {

            if ((privateTs.isExpressionNode(node) || node.kind === ts.SyntaxKind.Identifier || privateTs.isDeclarationName(node)) &&
                checker.getTypeAtLocation(node) === /** @type {*} */(checker).getAnyType()) {
                count++
            }
            return ts.forEachChild(node, walk)
        }
        for (const file of program.getRootFileNames()) {
            const sourceFile = program.getSourceFile(file)
            if (sourceFile) {
                walk(sourceFile)
            }
            else {
                console.log("couldn't find " + file)
            }
        }
        return count
    })
