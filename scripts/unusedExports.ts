import { join, relative } from "node:path"
import { BindingNamedNode, Node, Project, SyntaxKind, ts } from "ts-morph"
import { PackageJson } from "type-fest"
import { getEntryPointsToRelativeDtsPaths } from "./docgen/api/utils.js"
import {
    findPackageRoot,
    fromHere,
    fromPackageRoot,
    readPackageJson
} from "@re-/node"

const ignoreUnusedComment = "@ignore-unused"

type DeclarationInfo = {
    filePath: string
    text: string
    declarationNode: Node<ts.Node>
    referencesLength: number
    declarationName: string
}
const checkForIgnoreUnusedComment = ({
    filePath,
    text,
    declarationNode,
    referencesLength,
    declarationName
}: DeclarationInfo) => {
    for (const range of declarationNode.getLeadingCommentRanges()) {
        if (
            text
                .slice(range.getPos(), range.getEnd())
                .includes(ignoreUnusedComment)
        ) {
            if (referencesLength > 1) {
                console.log(
                    `${ignoreUnusedComment} wasn't needed for ${declarationName} - ${filePath}\n`
                )
            }
            return true
        }
    }
    return false
}
const project = new Project({
    tsConfigFilePath: fromHere("..", "tsconfig.references.json")
})
const unusedExports: Record<string, string[]> = {}
const ignorePaths: RegExp[] = [new RegExp(join("docs", "snippets"))]
const exportAllRenamedRegex = /\* as /

export const findUnusedExports = () => {
    const apiExports = getPublicApiExports(project)
    for (const sourceFile of project.getSourceFiles()) {
        const file = relative(".", sourceFile.getFilePath())
        const text = sourceFile.getFullText()
        if (ignorePaths.some((pathRegex) => pathRegex.test(file))) {
            continue
        }
        const unusedExportsInFile = []
        for (const [
            name,
            declarations
        ] of sourceFile.getExportedDeclarations()) {
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
                const publicApiExport = apiExports.find(
                    (apiExport) => apiExport.path === findPackageRoot(file)
                )

                if (publicApiExport) {
                    if (publicApiExport.exportedDeclarations.includes(name)) {
                        return []
                    }
                }
                const references = (declaration as any as BindingNamedNode)
                    .findReferences()
                    .flatMap((ref) => ref.getReferences())

                const hasIgnoreComment = checkForIgnoreUnusedComment({
                    declarationNode: declaration.isKind(
                        SyntaxKind.VariableDeclaration
                    )
                        ? declaration.getFirstAncestorByKindOrThrow(
                              SyntaxKind.VariableStatement
                          )
                        : declaration,
                    filePath: file,
                    text,
                    referencesLength: references.length,
                    declarationName: (
                        declaration as any as BindingNamedNode
                    ).getName()
                })
                if (hasIgnoreComment) {
                    return []
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
    return unusedExports
}

export const logUnusedExportsToConsole = (
    unusedExports: Record<string, string[]>
) => {
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
}

export type ApiExports = {
    path: string
    exportedDeclarations: string[]
}

export const getPublicApiExports = (project: Project): ApiExports[] => {
    const rootDir = fromPackageRoot("@re-")
    const publicApis = ["assert", "model"]
    const exportAllRegex = /export \*/
    const apiExports: ApiExports[] = []
    for (const publicApi of publicApis) {
        const packageRoot = join(rootDir, publicApi)
        const packageJsonData: PackageJson = readPackageJson(packageRoot)
        const entryPoints = getEntryPointsToRelativeDtsPaths(packageJsonData)
        const pathToSourceFile = join(packageRoot, ...entryPoints[0])
        const sourceFile = project.addSourceFileAtPath(pathToSourceFile)

        const publicApiExports = sourceFile
            .getExportDeclarations()
            .filter(
                (declaration) => !exportAllRegex.test(declaration.getText())
            )
            .map((declaration) => {
                return {
                    path: packageRoot,
                    exportedDeclarations: declaration
                        .getNamedExports()
                        .map((namedExport) => namedExport.getName())
                }
            })
        if (publicApiExports.length) {
            apiExports.push(...publicApiExports)
        }
    }
    return apiExports
}
