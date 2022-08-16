import { join, relative } from "node:path"
import {
    findPackageRoot,
    fromHere,
    fromPackageRoot,
    readPackageJson
} from "@re-/node"
import {
    BindingNamedNode,
    Node,
    Project,
    SourceFile,
    SyntaxKind,
    ts
} from "ts-morph"
import { PackageJson } from "type-fest"
import { getEntryPointsToRelativeDtsPaths } from "./docgen/api/utils.js"

const ignoreUnusedComment = "@ignore-unused"
const rootDir = fromPackageRoot("@re-")
const publicApis = ["assert", "model"]
const exportAllRegex = /export \*/

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

        if (ignorePaths.some((pathRegex) => pathRegex.test(file))) {
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
type UnusedFileExportsContext = {
    sourceFile: SourceFile
    apiExports: ApiExports[]
    file: string
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
const findUnusedExportsInFile = (context: UnusedFileExportsContext) => {
    const unusedExportsInFile = []
    for (const [
        name,
        declarations
    ] of context.sourceFile.getExportedDeclarations()) {
        const references = declarations.flatMap((declaration) => {
            if (shouldIgnoreDeclaration(name, declaration, context)) {
                return []
            }
            const references = (declaration as any as BindingNamedNode)
                .findReferences()
                .flatMap((ref) => ref.getReferences())

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

export const getPublicApiExports = (project: Project): ApiExports[] => {
    const apiExports: ApiExports[] = []
    for (const publicApi of publicApis) {
        const packageRoot = join(rootDir, publicApi)
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
