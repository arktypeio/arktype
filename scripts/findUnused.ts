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

const checkForIgnoreUnusedComment = (
    sourceFileText: string,
    range: CommentRange,
    referencesLength: number,
    declarationName: string
) => {
    const foundComment = sourceFileText
        .slice(range.getPos(), range.getEnd())
        .includes(ignoreUnusedComment)
    if (referencesLength > 1 && foundComment) {
        console.log(`@ignore-unused wasn't needed for ${declarationName}`)
    }
    return foundComment
}

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
            if (declaration.getSourceFile() !== sourceFile) {
                return []
            }
            if (exportAllRenamedRegex.test(declaration.getText())) {
                return []
            }
            const knownExport = apiExports.find(
                (apiExport) => apiExport.path === file
            )
            if (knownExport) {
                if (knownExport.exportedDeclarations.includes(name)) {
                    return []
                }
            }
            const references = (declaration as any as BindingNamedNode)
                .findReferences()
                .flatMap((ref) => ref.getReferences())

            switch (declaration.getKindName()) {
                case "VariableDeclaration":
                    {
                        const ranges = declaration
                            .getParent()
                            ?.getParent()
                            ?.getLeadingCommentRanges()

                        for (const range of ranges!) {
                            if (
                                checkForIgnoreUnusedComment(
                                    sourceFileText,
                                    range,
                                    references.length,
                                    (
                                        declaration as any as BindingNamedNode
                                    ).getName()
                                )
                            ) {
                                return []
                            }
                        }
                    }
                    break
                default: {
                    const ranges = declaration.getLeadingCommentRanges()

                    for (const range of ranges!) {
                        if (
                            checkForIgnoreUnusedComment(
                                sourceFileText,
                                range,
                                references.length,
                                (
                                    declaration as any as BindingNamedNode
                                ).getName()
                            )
                        ) {
                            return []
                        }
                    }
                }
            }
            return references
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
