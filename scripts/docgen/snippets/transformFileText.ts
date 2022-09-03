import { Project, SourceFile, SyntaxKind } from "ts-morph"
import { PackageMetadata } from "../extract.js"
import { SnippetTransformToggles } from "./index.js"

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
        // Replace relative internal imports with standard external imports
        const importDeclarations = sourceFile.getDescendantsOfKind(
            SyntaxKind.ImportDeclaration
        )
        for (const declaration of importDeclarations) {
            const specifier = declaration.getModuleSpecifier()
            if (specifier.getLiteralText().endsWith("../index.js")) {
                specifier.replaceWithText(`"${ctx.packageMetadata.name}"`)
            }
        }
    }
    sourceFile
        .getDescendantsOfKind(SyntaxKind.SingleLineCommentTrivia)
        .filter((comment) => comment.getText().includes("@snipStatement"))
        .forEach((comment) => {
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
        })
    sourceFile.refreshFromFileSystem()
    return sourceFile.getFullText()
}
