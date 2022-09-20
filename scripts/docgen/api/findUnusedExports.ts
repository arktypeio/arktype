import { existsSync } from "node:fs"
import { join, relative } from "node:path"
import {
    ExportedDeclarations,
    Node,
    Project,
    SourceFile,
    SyntaxKind,
    ts
} from "ts-morph"
import { PackageJson } from "type-fest"
import { getEntryPointsToRelativeDtsPaths } from "./utils.js"
import { findPackageRoot, fromPackageRoot, readPackageJson } from "@re-/node"

const ignoreUnusedComment = "@ignore-unused"
const rootDir = fromPackageRoot("@re-")
const publicApis = ["assert", "type"]
const exportAllRegex = /export \*/

const project = new Project({
    tsConfigFilePath: fromPackageRoot("tsconfig.references.json")
})

const unusedExports: Record<string, string[]> = {}
const ignorePaths: string[] = [join("src", "__snippets__")]
const exportAllRenamedRegex = /\* as /

export const findUnusedExports = () => {
    const apiExports = getPublicApiExports(project)
    for (const sourceFile of project.getSourceFiles()) {
        const file = relative(".", sourceFile.getFilePath())
        if (ignorePaths.some((path) => file.includes(path))) {
            continue
        }
        const unusedExportsInFile = findUnusedExportsInFile({
            sourceFile,
            apiExports,
            file
        })
        if (unusedExportsInFile.length) {
            unusedExports[file] = unusedExportsInFile
        }
    }
    return unusedExports
}

type UnusedFileExportsContext = {
    sourceFile: SourceFile
    apiExports: ApiExports[]
    file: string
}

const findUnusedExportsInFile = (context: UnusedFileExportsContext) => {
    const exportedDeclarations = context.sourceFile.getExportedDeclarations()
    return findUnusedDeclarations(exportedDeclarations, context)
}

const findUnusedDeclarations = (
    exportedDeclarations: ReadonlyMap<string, ExportedDeclarations[]>,
    context: UnusedFileExportsContext
) => {
    const unusedExportsInFile: string[] = []

    for (const [name, declarations] of exportedDeclarations) {
        const references = declarations.flatMap((declaration) => {
            if (shouldIgnoreDeclaration(name, declaration, context)) {
                return []
            }
            if (declaration.isKind(SyntaxKind.ModuleDeclaration)) {
                const exportedDeclationsInNamespace =
                    declaration.getExportedDeclarations()
                unusedExportsInFile.push(
                    ...findUnusedDeclarations(
                        exportedDeclationsInNamespace,
                        context
                    )
                )
            }
            const references = getExportReferences(declaration)
            if (
                checkForIgnoreUnusedComment(
                    name,
                    declaration,
                    context,
                    references.length
                )
            ) {
                return []
            }
            return references
        })
        if (references.length === 1) {
            unusedExportsInFile.push(name)
        }
    }
    return unusedExportsInFile
}

const getExportReferences = (node: ExportedDeclarations) => {
    if (!("findReferences" in node)) {
        return throwMissingMethodError("findReferences")
    }
    return node.findReferences().flatMap((ref) => ref.getReferences())
}

const shouldIgnoreDeclaration = (
    name: string,
    declaration: Node<ts.Node>,
    context: UnusedFileExportsContext
) => {
    const { sourceFile, apiExports } = context

    if (declaration.isKind(SyntaxKind.ExportSpecifier)) {
        return true
    }
    if (declaration.getSourceFile() !== sourceFile) {
        return true
    }
    if (exportAllRenamedRegex.test(declaration.getText())) {
        return true
    }

    const publicApiExport = apiExports.find(
        (apiExport) => apiExport.path === findPackageRoot(context.file)
    )

    if (publicApiExport) {
        if (publicApiExport.exportedDeclarations.includes(name)) {
            return true
        }
    }
    return false
}

const checkForIgnoreUnusedComment = (
    name: string,
    declaration: Node<ts.Node>,
    context: UnusedFileExportsContext,
    referencesLength: number
) => {
    const text = context.sourceFile.getFullText()
    const declarationNode = declaration.isKind(SyntaxKind.VariableDeclaration)
        ? declaration.getFirstAncestorByKindOrThrow(
              SyntaxKind.VariableStatement
          )
        : declaration
    for (const range of declarationNode.getLeadingCommentRanges()) {
        if (
            text
                .slice(range.getPos(), range.getEnd())
                .includes(ignoreUnusedComment)
        ) {
            if (referencesLength > 1) {
                console.log(
                    `${ignoreUnusedComment} wasn't needed for ${name} - ${context.file}\n`
                )
            }
            return true
        }
    }
    return false
}

const throwMissingMethodError = (fnName: string) => {
    throw Error(`Expected to find ${fnName} method!`)
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
    const apiExports: ApiExports[] = []
    for (const publicApi of publicApis) {
        const packageRoot = join(rootDir, publicApi)
        if (!existsSync(packageRoot)) {
            throw new Error(`${packageRoot} does not exist.`)
        }
        const packageJsonData: PackageJson = readPackageJson(packageRoot)
        const entryPoints = getEntryPointsToRelativeDtsPaths(packageJsonData)
        const pathToSourceFile = join(packageRoot, ...entryPoints[0])
        const sourceFile = project.addSourceFileAtPath(pathToSourceFile)
        const entryPointExports = getEntryPointExports(sourceFile, packageRoot)
        if (entryPointExports.length) {
            apiExports.push(...entryPointExports)
        }
    }
    return apiExports
}

const getEntryPointExports = (sourceFile: SourceFile, packageRoot: string) =>
    sourceFile
        .getExportDeclarations()
        .filter((declaration) => !exportAllRegex.test(declaration.getText()))
        .map((declaration) => {
            return {
                path: packageRoot,
                exportedDeclarations: declaration
                    .getNamedExports()
                    .map((namedExport) => namedExport.getName())
            }
        })
