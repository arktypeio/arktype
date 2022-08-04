import { relative } from "node:path"
import { fromHere } from "@re-/node"
import { BindingNamedNode, Project } from "ts-morph"

const project = new Project({
    tsConfigFilePath: fromHere("..", "tsconfig.references.json")
})

const unused: Record<string, string[]> = {}
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
    if (
        snippetFileRegex.test(file) ||
        apiExports.includes(sourceFile.getBaseNameWithoutExtension())
    ) {
        continue
    }
    const unusedInFile = []
    for (const exportedSymbol of sourceFile.getExportSymbols()) {
        const exportName = exportedSymbol.getName()
        const references = exportedSymbol
            .getDeclarations()
            .flatMap((declaration) => {
                if (declaration.getKindName() === "ExportSpecifier") {
                    return []
                }
                if (declaration.getSourceFile() !== sourceFile) {
                    return []
                }
                if (declaration.getText().includes("* as")) {
                    return []
                }
                return (declaration as any as BindingNamedNode)
                    .findReferences()
                    .flatMap((ref) => ref.getReferences())
            })
        if (references.length === 1) {
            unusedInFile.push(exportName)
        }
    }
    if (unusedInFile.length) {
        unused[file] = unusedInFile
    }
}

if (Object.keys(unused).length) {
    console.error("The following unused exports must be removed:")
    for (const [file, unusedNames] of Object.entries(unused)) {
        console.group(`\n${file}:`)
        for (const unusedName of unusedNames) {
            console.log(`❌${unusedName}`)
        }
        console.groupEnd()
    }
    process.exit(1)
}
