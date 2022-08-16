import { join, relative } from "node:path"
import { findPackageRoot, fromHere } from "@re-/node"
import { BindingNamedNode, Project, SyntaxKind } from "ts-morph"
import {
    checkForIgnoreUnusedComment,
    getPublicApiExports
} from "./findUnusedHelpers.js"

const project = new Project({
    tsConfigFilePath: fromHere("..", "tsconfig.references.json")
})

const unusedExports: Record<string, string[]> = {}
const ignorePaths: RegExp[] = [new RegExp(join("docs", "snippets"))]
const exportAllRenamedRegex = /\* as /

const apiExports = getPublicApiExports(project)

for (const sourceFile of project.getSourceFiles()) {
    const file = relative(".", sourceFile.getFilePath())
    const text = sourceFile.getFullText()

    if (ignorePaths.some((pathRegex) => pathRegex.test(file))) {
        continue
    }

    const unusedExportsInFile = []
    for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
        const references = declarations.flatMap((declaration) => {
            if (declaration.isKind(SyntaxKind.ExportSpecifier)) {
                return []
            }
            if (declaration.getSourceFile() !== sourceFile) {
                return []
            }
            if (exportAllRenamedRegex.test(declaration.getText())) {
                return []
            }
            const knownExport = apiExports.find(
                (apiExport) => apiExport.path === findPackageRoot(file)
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
                text,
                referencesLength: references.length,
                declarationName: (
                    declaration as any as BindingNamedNode
                ).getName()
            }
            if (declaration.isKind(SyntaxKind.VariableDeclaration)) {
                const hasIgnoreComment = checkForIgnoreUnusedComment({
                    ...sourceFileAndReferencesData,
                    declarationNode: declaration.getFirstAncestorByKindOrThrow(
                        SyntaxKind.VariableStatement
                    )
                })
                if (hasIgnoreComment) {
                    return []
                }
            } else {
                const hasIgnoreComment = checkForIgnoreUnusedComment({
                    ...sourceFileAndReferencesData,
                    declarationNode: declaration
                })

                if (hasIgnoreComment) {
                    return []
                }
            }
            return references
        })
        if (references.length === 1) {
            unusedExportsInFile.push(name)
        }
    }
    if (unusedExportsInFile.length) {
        unusedExports[file] = unusedExportsInFile
    }
}

if (Object.keys(unusedExports).length) {
    console.error("The following unused exports must be removed:")
    for (const [file, unusedNames] of Object.entries(unusedExports)) {
        console.group(`\n${file}:`)
        for (const unusedName of unusedNames) {
            console.log(`❌${unusedName}`)
        }
        console.groupEnd()
    }
}
