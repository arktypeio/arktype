import type { Project, SourceFile } from "ts-morph"
import { SyntaxKind } from "ts-morph"
import type { PackageMetadata } from "../extract.js"
import type { SnippetTransformToggles } from "./index.js"

export type ExtractFileSnippetContext = {
    packageMetadata: PackageMetadata
    transforms: SnippetTransformToggles
}
export const getTransformedText = (
    path: string,
    ctx: ExtractFileSnippetContext,
    project: Project
): string => {
    const sourceFile = project.addSourceFileAtPath(path)
    if (ctx.transforms.imports) {
        transformRelativeImports(sourceFile, ctx.packageMetadata.name)
    }
    transformSnipStatementComments(sourceFile)
    sourceFile.refreshFromFileSystem()
    return sourceFile.getFullText()
}

// Replace relative internal imports with standard external imports
export const transformRelativeImports = (
    sourceFile: SourceFile,
    packageName: string
) => {
    const importDeclarations = sourceFile.getDescendantsOfKind(
        SyntaxKind.ImportDeclaration
    )
    for (const declaration of importDeclarations) {
        const specifier = declaration.getModuleSpecifier()
        if (specifier.getLiteralText().endsWith("../index.js")) {
            specifier.replaceWithText(`"${packageName}"`)
        }
    }
}

export const transformSnipStatementComments = (sourceFile: SourceFile) => {
    const snipStatementComments = sourceFile
        .getDescendants()
        .filter(
            (node) =>
                node.isKind(SyntaxKind.SingleLineCommentTrivia) &&
                node.getText().includes("@snipStatement")
        )
    for (const comment of snipStatementComments) {
        const commentText = comment
            .getText()
            .replace("@snipStatement", "@snipStart")
        comment.replaceWithText(commentText)
        const nextStatement = comment.getNextSiblingOrThrow()
        nextStatement.replaceWithText(
            `${nextStatement.getText()}\n${commentText.replace(
                "@snipStart",
                "@snipEnd"
            )}`
        )
    }
}
