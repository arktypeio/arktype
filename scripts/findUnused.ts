import { relative } from "node:path"
import { fromHere } from "@re-/node"
import { Project, SyntaxKind } from "ts-morph"

const project = new Project({
    tsConfigFilePath: fromHere("..", "tsconfig.references.json")
})
const unusedByFile: Record<string, string[]> = {}
const snippetFileRegex = /snippets\/\w+/
const exportAllRegex = /export \*/
const packagesThatExposePublicApi = {}
for (const sourceFile of project.getSourceFiles()) {
    const file = relative(".", sourceFile.getFilePath())
    if (snippetFileRegex.test(file)) {
        continue
    }
    const unusedInFile = []
    for (const statement of sourceFile.getVariableStatements()) {
        if (statement.hasModifier(SyntaxKind.ExportKeyword)) {
            if (exportAllRegex.test(statement.getText())) {
                console.log(statement.getText())
            }
            const declarations = statement.getDeclarations()
            for (const declaration of declarations) {
                const references = declaration
                    .findReferences()
                    .flatMap((ref) => ref.getReferences())
                if (references.length === 1) {
                    unusedInFile.push(declaration.getName())
                }
            }
        }
        if (unusedInFile.length) {
            unusedByFile[file] = unusedInFile
        }
    }
}
if (Object.keys(unusedByFile).length) {
    console.error("Code doesn't need to be exported or is unused")
    for (const [file, unusedNames] of Object.entries(unusedByFile)) {
        console.group(`\n${file}:`)
        for (const unusedName of unusedNames) {
            console.log(`❌${unusedName}`)
        }
        console.groupEnd()
    }
    process.exit(1)
}
