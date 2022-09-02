import { join } from "node:path"
import {
    ExportedDeclarations,
    JSDoc,
    JSDocableNode,
    Project,
    SourceFile,
    SyntaxKind
} from "ts-morph"
import { PackageJson } from "type-fest"
import { getEntryPointsToRelativeDtsPaths } from "./utils.js"

export type ApiEntryPoint = {
    subpath: string
    exports: ExportData[]
}

export type ExtractPackageApiContext = {
    project: Project
    packageJson: PackageJson
    rootDir: string
}

export const extractPackageApi = ({
    project,
    packageJson,
    rootDir
}: ExtractPackageApiContext): ApiEntryPoint[] => {
    const entryPoints = getEntryPointsToRelativeDtsPaths(packageJson)
    return entryPoints.map(([subpath, relativeDtsPath]) => {
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

const expectedTsDocAncestorKinds = {
    [SyntaxKind.VariableDeclaration]: SyntaxKind.VariableStatement
}

const findAssociatedDocs = (
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

const extractExportData = (
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
