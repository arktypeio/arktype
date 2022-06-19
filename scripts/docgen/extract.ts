import { join } from "node:path"
import { fromHere, readPackageJson } from "@re-/node"
import {
    ExportedDeclarations,
    JSDoc,
    JSDocableNode,
    Project,
    SourceFile,
    SyntaxKind
} from "ts-morph"
import { PackageJson } from "type-fest"
import { DocGenConfig, DocGenPackageConfig } from "./config.js"

const REPO_ROOT = fromHere("..", "..")

export type RepoMetadata = PackageData[]

export const extractRepoMetaData = (config: DocGenConfig): RepoMetadata => {
    const data: PackageData[] = []
    const project = new Project({
        tsConfigFilePath: join(REPO_ROOT, "tsconfig.references.json"),
        skipAddingFilesFromTsConfig: true
    })
    for (const packageConfig of config.packages) {
        data.push(extractPackageData(project, packageConfig))
    }
    return data
}

export type PackageData = {
    name: string
    version: string
    api: EntryPointData[]
}

export type EntryPointData = {
    subpath: string
    exports: ExportData[]
}

export const extractPackageData = (
    project: Project,
    packageConfig: DocGenPackageConfig
): PackageData => {
    const packageRoot = join(REPO_ROOT, packageConfig.path)
    const packageJson = readPackageJson(packageRoot)
    const entryPoints = getEntryPointsToRelativeDtsPaths(packageJson)
    const api = entryPoints.map(([subpath, relativeDtsPath]) => {
        const entryPointDts = project.addSourceFileAtPath(
            join(packageRoot, relativeDtsPath)
        )
        return {
            subpath,
            exports: extractExportsFromDts(entryPointDts)
        }
    })
    return {
        name: packageJson.name,
        version: packageJson.version,
        api
    }
}

export const hasTypesExport = (
    conditions: PackageJson.Exports
): conditions is { types: string } =>
    typeof conditions === "object" &&
    conditions !== null &&
    "types" in conditions

export type EntryPointPathEntry = [string, string]

export const getEntryPointsToRelativeDtsPaths = (
    packageJson: PackageJson
): EntryPointPathEntry[] => {
    if (!packageJson.exports) {
        throw new Error(
            `Package '${packageJson.name}' requires an 'exports' field in its package.json.`
        )
    }
    return Object.entries(packageJson.exports).map(([path, conditions]) => {
        if (!hasTypesExport(conditions)) {
            throw new Error(
                `Export ${path} from package.json in '${packageJson.name}' requires a 'types' key.`
            )
        }
        return [path, conditions.types]
    })
}

export type ExportData = {
    name: string
    text: string
    tsDocs: TsDocData[] | undefined
}

export const extractExportsFromDts = (
    entryPointDts: SourceFile
): ExportData[] => {
    const exportNodes = entryPointDts.getExportedDeclarations().entries()
    const exports: ExportData[] = []
    for (const [name, exportDeclarations] of exportNodes) {
        exports.push(extractExportData(name, exportDeclarations))
    }
    return exports
}

export const expectedTsDocAncestorKinds = {
    [SyntaxKind.VariableDeclaration]: SyntaxKind.VariableStatement
}

export const findAssociatedDocs = (
    declaration: ExportedDeclarations
): JSDoc[] | undefined => {
    const ancestorKind = (expectedTsDocAncestorKinds as any)[
        declaration.getKind()
    ]
    if (ancestorKind) {
        const possiblyDocumentedAncestor = declaration.getFirstAncestorByKind(
            ancestorKind
        ) as undefined | JSDocableNode
        if (possiblyDocumentedAncestor) {
            return possiblyDocumentedAncestor.getJsDocs()
        }
    }
}

export const extractExportData = (
    name: string,
    declarations: ExportedDeclarations[]
): ExportData => {
    if (declarations.length > 1) {
        throw new Error(
            `More than one declaration for ${name} is not supported.`
        )
    }
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

export const extractTsDocData = (
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
