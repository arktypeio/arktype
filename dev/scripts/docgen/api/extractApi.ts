import { join } from "node:path"
import type {
    ExportedDeclarations,
    JSDoc,
    JSDocableNode,
    Project,
    SourceFile
} from "ts-morph"
import { SyntaxKind } from "ts-morph"
import { readPackageJson } from "../../../runtime/main.ts"
import { getEntryPointsToRelativeDtsPaths } from "./utils.ts"

export type ApiEntryPoint = {
    subpath: string
    exports: ExportData[]
}

export type ExtractPackageApiContext = {
    project: Project
    packageJson: Record<string, unknown>
    rootDir: string
}

export type PackageExtractionData = {
    metadata: PackageMetadata
    api: ApiEntryPoint[]
}

export type PackageMetadata = {
    name: string
    version: string
    rootDir: string
    packageJsonData: Record<string, unknown>
}

export const extractApi = (project: Project, packageRoot: string) => {
    const packageJsonData = readPackageJson(packageRoot)
    const metadata: PackageMetadata = {
        name: packageJsonData.name!,
        version: packageJsonData.version!,
        rootDir: packageRoot,
        packageJsonData
    }
    const api = extractEntryPoints({
        project,
        packageJson: packageJsonData,
        rootDir: packageRoot
    })

    return {
        metadata,
        api
    }
}

export const extractEntryPoints = ({
    project,
    packageJson,
    rootDir
}: ExtractPackageApiContext): ApiEntryPoint[] => {
    const entryPoints = getEntryPointsToRelativeDtsPaths(packageJson)
    return entryPoints
        .filter(([subpath]) => !subpath.includes("internal"))
        .map(([subpath, relativeDtsPath]) => {
            const entryPointDts = project.addSourceFileAtPath(
                join(rootDir, relativeDtsPath)
            )
            return {
                subpath,
                exports: extractExportsFromDts(entryPointDts)
            }
        })
}

export type ExportData = {
    name: string
    text: string
    tsDocs: TsDocData[] | undefined
}

const extractExportsFromDts = (entryPointDts: SourceFile): ExportData[] => {
    const exportNodes = entryPointDts.getExportedDeclarations().entries()
    const exports: ExportData[] = []
    for (const [name, exportDeclarations] of exportNodes) {
        exports.push(extractExportData(name, exportDeclarations))
    }
    return exports
}

const isJSDocableNode = (declaration: unknown): declaration is JSDocableNode =>
    (declaration as JSDocableNode).getJsDocs !== undefined

const find = <t extends readonly unknown[], narrowed>(
    t: t,
    condition: (item: t[number]) => item is narrowed
): narrowed | undefined => t.find(condition)

const findAssociatedDocs = (
    declaration: ExportedDeclarations
): JSDoc[] | undefined => {
    const possiblyDocumentedAncestor = isJSDocableNode(declaration)
        ? declaration
        : find(declaration.getAncestors(), isJSDocableNode)

    if (possiblyDocumentedAncestor) {
        return possiblyDocumentedAncestor.getJsDocs()
    }
}

const extractExportData = (
    name: string,
    declarations: ExportedDeclarations[]
): ExportData => {
    const declaration = declarations[0]
    return {
        name,
        text: declarations.map((node) => node.getText()).join("\n"),
        tsDocs: extractTsDocData(declaration)
    }
}

export type TsDocData = {
    tag: string
    text: string
}

const extractTsDocData = (
    declaration: ExportedDeclarations
): TsDocData[] | undefined => {
    const associatedTsDocTags = findAssociatedDocs(declaration)?.flatMap(
        (tsDocs) => tsDocs.getTags()
    )
    if (associatedTsDocTags) {
        return associatedTsDocTags.map((tagNode) => ({
            tag: tagNode.getTagName(),
            text: tagNode.getText()
        }))
    }
}
