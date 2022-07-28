import { relative } from "node:path"
import { BindingNamedNode, Project } from "ts-morph"

const project = new Project({
    tsConfigFilePath: "tsconfig.references.json"
})

const unusedByFile: Record<string, string[]> = {}

/**
 * Goal: Find exports that are not referenced in any non-test file,
 * and are not an entry point for a public package (i.e. @re-/type, @re-/assert)
 *
 * Notes:
 * - Even if the export is re-exported by an index.ts file, unless it is explicitly
 * references somewhere by name, it should not be considered used.
 *
 * - Can either check whether the export is referenced anywhere explicitly by name,
 * even if it is reexported (e.g. export { type } from "@re-/type") (this would
 * be a heuristic for whether it's part of a public API) or have a special
 * case for entry point files for public packages.
 */

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
        unusedByFile[file] = unusedInFile
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
