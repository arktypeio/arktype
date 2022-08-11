import { relative } from "node:path"
import { fromHere } from "@re-/node"
import { BindingNamedNode, Node, Project, ts } from "ts-morph"

const project = new Project({
    tsConfigFilePath: fromHere("..", "tsconfig.references.json")
})

const unused: Record<string, string[]> = {}
const snippetFileRegex = /snippets\/\w+/
const exportAllRegex = /export \*/
const exportAllRenamedRegex = /\* as /
const ignoreUnusedComment = "@ignore-unused"
const apiExports: ApiExports[] = []
const sourceFiles = project.getSourceFiles()
type DeclarationInfo = {
    filePath: string
    sourceFileText: string
    declarationNode: Node<ts.Node>
    referencesLength: number
    declarationName: string
}
type ApiExports = {
    path: string
    exportedDeclarations: string[]
}
const checkForIgnoreUnusedComment = ({
    filePath,
    sourceFileText,
    declarationNode,
    referencesLength,
    declarationName
}: DeclarationInfo) => {
    for (const range of declarationNode.getLeadingCommentRanges()) {
        if (
            sourceFileText
                .slice(range.getPos(), range.getEnd())
                .includes(ignoreUnusedComment)
        ) {
            if (referencesLength > 1) {
                console.log(
                    `@ignore-unused wasn't needed for ${declarationName} - ${filePath}\n`
                )
            }
            return true
        }
    }
    return false
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
    if (publicApiExports.length) {
        apiExports.push(...publicApiExports)
    }
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

            const sourceFileAndReferencesData = {
                filePath: file,
                sourceFileText,
                referencesLength: references.length,
                declarationName: (
                    declaration as any as BindingNamedNode
                ).getName()
            }
            switch (declaration.getKindName()) {
                case "VariableDeclaration":
                    {
                        const foundComment = checkForIgnoreUnusedComment({
                            ...sourceFileAndReferencesData,
                            declarationNode: declaration
                                .getParentOrThrow()
                                .getParentOrThrow()
                        })

                        if (foundComment) {
                            return []
                        }
                    }
                    break
                default: {
                    const foundComment = checkForIgnoreUnusedComment({
                        ...sourceFileAndReferencesData,
                        declarationNode: declaration
                    })

                    if (foundComment) {
                        return []
                    }
                }
            }
            return references
        })
        if (references.length === 1) {
            unusedInFile.push(name)
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
}
