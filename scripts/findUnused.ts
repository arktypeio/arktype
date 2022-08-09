import { relative } from "node:path"
import { fromHere } from "@re-/node"
import { BindingNamedNode, CommentRange, Project } from "ts-morph"

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
    for (const exportedSymbol of sourceFile.getExportSymbols()) {
        const exportName = exportedSymbol.getName()
        const references = exportedSymbol
            .getDeclarations()
            .flatMap((declaration) => {
                const publicApiExport = apiExports.find(
                    (apiExport) => apiExport.path === exportName
                )
                if (publicApiExport) {
                    return []
                }
                if (declaration.getKindName() === "ExportSpecifier") {
                    return []
                }
                if (exportAllRenamedRegex.test(declaration.getText())) {
                    return []
                }
                if (declaration.getSourceFile() !== sourceFile) {
                    return []
                }
                const commentRanges = declaration.getLeadingCommentRanges()
                let hasComment = false
                for (const range of commentRanges) {
                    console.log(
                        sourceFileText
                            .slice(range.getPos(), range.getEnd())
                            .includes(ignoreUnusedComment)
                    )
                    // if (
                    //     sourceFileText
                    //         .slice(range.getPos(), range.getEnd())
                    //         .includes(ignoreUnusedComment)
                    // ) {
                    //     hasComment = true
                    //     break
                    // }
                }
                if (hasComment) {
                    console.log("HOLY BATMAN")
                    console.log(declaration.getText())
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
