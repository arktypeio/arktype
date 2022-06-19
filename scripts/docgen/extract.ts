import { join } from "node:path"
import { ValueOf } from "@re-/tools"
import {
    ExportedDeclarations,
    JSDoc,
    JSDocableNode,
    Project,
    SourceFile,
    SyntaxKind
} from "ts-morph"
import { fromHere } from "../../@re-/node/src/index.js"
import { DocGenConfig, DocGenPackageConfig } from "./config.js"

export type ExtractedData = EntryPointData[]

export type EntryPointData = {
    packageName: string
    path: string
    exports: ExportData[]
}

export type ExportData = {
    name: string
    text: string
    tsDocs: TsDocData[] | undefined
}

export type TsDocData = {
    tag: string
    text: string
}

const REPO_ROOT = fromHere("..", "..")

export const extractDocData = (config: DocGenConfig) => {
    const data: ExtractedData = []
    const project = new Project({
        tsConfigFilePath: join(REPO_ROOT, "tsconfig.references.json")
    })
    for (const packageConfig of config.packages) {
        data.push(...extractPackageData(project, packageConfig))
    }
    return data
}

export const extractPackageData = (
    project: Project,
    packageConfig: DocGenPackageConfig
) => {
    const extractedEntryPoints: EntryPointData[] = []
    const packageName = packageConfig.name
    const packageRoot = join(REPO_ROOT, packageName)
    for (const entryPoint of packageConfig.entryPoints) {
        const entryPointPath = join(packageRoot, entryPoint)
        const entryPointFile = project.getSourceFileOrThrow(entryPointPath)
        extractedEntryPoints.push({
            packageName,
            path: entryPoint,
            exports: extractExportDataFromEntryPoint(entryPointFile)
        })
    }
    return extractedEntryPoints
}

export const extractExportDataFromEntryPoint = (
    entryPointFile: SourceFile
): ExportData[] => {
    const exportNodes = entryPointFile.getExportedDeclarations().entries()
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
