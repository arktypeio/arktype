import { join } from "node:path"
import { fromPackageRoot, readPackageJson } from "@re-/node"
import { Node, Project, ts } from "ts-morph"
import { PackageJson } from "type-fest"
import { getEntryPointsToRelativeDtsPaths } from "./docgen/utils.js"

export type ApiExports = {
    path: string
    exportedDeclarations: string[]
}

export const getPublicApiExports = (project: Project): ApiExports[] => {
    const rootDir = fromPackageRoot("@re-")
    const publicApis = ["assert", "model"]
    const exportAllRegex = /export \*/
    const apiExports: ApiExports[] = []
    publicApis.forEach((knownPublicApi) => {
        const packageRoot = join(rootDir, knownPublicApi)
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
    })
    return apiExports
}
const ignoreUnusedComment = "@ignore-unused"

type DeclarationInfo = {
    filePath: string
    text: string
    declarationNode: Node<ts.Node>
    referencesLength: number
    declarationName: string
}
export const checkForIgnoreUnusedComment = ({
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
                    `@ignore-unused wasn't needed for ${declarationName} - ${filePath}\n`
                )
            }
            return true
        }
    }
    return false
}
