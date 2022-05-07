const { fromHere, dirName } = require("@re-/node")
const { Project } = require("ts-morph")
const { relative } = require("path")

const project = new Project({
    tsConfigFilePath: fromHere("src", "tsconfig.json")
})

const unused = {}

for (const sourceFile of project.getSourceFiles()) {
    const file = relative(dirName(), sourceFile.getFilePath())
    if (!file.startsWith("src")) {
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
                return declaration
                    .findReferences()
                    .flatMap((ref) => ref.getReferences())
            })
        if (references.length === 1) {
            unusedInFile.push(exportName)
        }
    }
    if (unusedInFile.length) {
        console.group(`${file}:`)
        unusedInFile.forEach((unusedName) => {
            console.log(`❌${unusedName}`)
        })
        unused[file] = unusedInFile
        console.groupEnd()
    }
}

if (Object.keys(unused).length) {
    console.error("Unused references must be removed before building.")
    process.exit(1)
}
