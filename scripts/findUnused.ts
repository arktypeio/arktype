import { relative } from "node:path"
import { BindingNamedNode, Project } from "ts-morph"

const project = new Project({
    tsConfigFilePath: "tsconfig.references.json"
})

const unused: Record<string, string[]> = {}

for (const sourceFile of project.getSourceFiles()) {
    const file = relative(".", sourceFile.getFilePath())
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
