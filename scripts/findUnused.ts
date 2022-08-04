import { relative } from "node:path"
import { fromHere } from "@re-/node"
import { Project, SyntaxKind } from "ts-morph"

const project = new Project({
    tsConfigFilePath: fromHere("..", "tsconfig.references.json")
})
const unusedByFile: Record<string, string[]> = {}
const snippetFileRegex = /snippets\/\w+/
const exportAllRegex = /export \*/
const exportNameRegex = /\.\/\w+/
const apiExports = []

const sourceFiles = project.getSourceFiles()
const indexFiles = sourceFiles.filter(
    (file) => file.getBaseName() === "index.ts"
)
for (const file of indexFiles) {
    const publicApiExports = file
        .getExportDeclarations()
        .filter((declaration) => exportAllRegex.test(declaration.getText()))
        .map((declaration) =>
            declaration.getText().match(exportNameRegex)![0].replace("./", "")
        )
    apiExports.push(...publicApiExports)
}
for (const sourceFile of project.getSourceFiles()) {
    const file = relative(".", sourceFile.getFilePath())
    const unusedInFile = []
    if (
        apiExports.includes(sourceFile.getBaseNameWithoutExtension()) ||
        snippetFileRegex.test(file)
    ) {
        continue
    }
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
    console.error("The following unused exports must be removed:")
    for (const [file, unusedNames] of Object.entries(unusedByFile)) {
        console.group(`\n${file}:`)
        for (const unusedName of unusedNames) {
            console.log(`❌${unusedName}`)
        }
        console.groupEnd()
    }
    process.exit(1)
}
