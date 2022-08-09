import { relative } from "node:path"
import { fromHere } from "@re-/node"
import { BindingNamedNode, Project } from "ts-morph"

const project = new Project({
    tsConfigFilePath: fromHere("..", "tsconfig.references.json")
})

const unused: Record<string, string[]> = {}
const snippetFileRegex = /snippets\/\w+/
const exportAllRegex = /export \*/
const exportAllRenamedRegex = /\* as /
const ignoreUnusedComment = "@ignore-unused"
const apiExports: { path: string; exportedDeclarations: string[] }[] = []

const sourceFiles = project.getSourceFiles()
const indexFiles = sourceFiles.filter(
    (file) => file.getBaseName() === "index.ts"
)
for (const file of indexFiles) {
    const publicApiExports = file
        .getExportDeclarations()
        .filter((declaration) => !exportAllRegex.test(declaration.getText()))
        .map((declaration) => {
            return {
                path: relative(".", declaration.getSourceFile().getFilePath()),
                exportedDeclarations: declaration
                    .getNamedExports()
                    .map((namedExport) => namedExport.getName())
            }
        })
    publicApiExports.length && apiExports.push(...publicApiExports)
}
for (const sourceFile of project.getSourceFiles()) {
    const file = relative(".", sourceFile.getFilePath())
    const sourceFileText = sourceFile.getFullText()
    if (snippetFileRegex.test(file)) {
        continue
    }
    const unusedInFile = []
    for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
        const references = declarations.flatMap((declaration) => {
            if (declaration.getKindName() === "ExportSpecifier") {
                return []
            }
            if (exportAllRenamedRegex.test(declaration.getText())) {
                return []
            }
            if (declaration.getSourceFile() !== sourceFile) {
                return []
            }
            if (name === "until") {
                console.log(declaration.getFullText())
                const declarationCommentRanges =
                    declaration.getLeadingCommentRanges()
                console.log(declarationCommentRanges)
                // for (const commentRange of declarationCommentRanges) {
                //     console.log(sourceFileText)
                // }
            }
            const knownExport = apiExports.find(
                (apiExport) => apiExport.path === file
            )
            if (knownExport) {
                if (knownExport.exportedDeclarations.includes(name)) {
                    return []
                }
            }

            return (declaration as any as BindingNamedNode)
                .findReferences()
                .flatMap((ref) => ref.getReferences())
        })
        if (references.length === 1) {
            unusedInFile.push(name)
        } else {
            //Here I can check if there's an unnecessary unused statement
        }
    }
    if (unusedInFile.length) {
        unused[file] = unusedInFile
    }
}

// if (Object.keys(unused).length) {
//     console.error("The following unused exports must be removed:")
//     for (const [file, unusedNames] of Object.entries(unused)) {
//         console.group(`\n${file}:`)
//         for (const unusedName of unusedNames) {
//             console.log(`❌${unusedName}`)
//         }
//         console.groupEnd()
//     }
//     process.exit(1)
// }
