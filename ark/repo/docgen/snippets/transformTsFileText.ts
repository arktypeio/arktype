import { findPackageRoot, readPackageJson } from "@arktype/fs"
import { SyntaxKind, type Project, type SourceFile } from "ts-morph"
import type { PackageMetadata } from "../api/extractApi.ts"
import type { DocGenSnippetsConfig } from "../docgen.ts"
import type { SnippetTransformToggles } from "./extractSnippets.ts"

export type ExtractFileSnippetContext = {
	packageMetadata: PackageMetadata
	transforms: SnippetTransformToggles
}
export const transformTsFileContents = (
	path: string,
	project: Project,
	config: DocGenSnippetsConfig
): string => {
	const sourceFile = project.addSourceFileAtPath(path)
	if (config.universalTransforms.imports) {
		transformRelativeImports(
			sourceFile,
			findPackageRoot(sourceFile.getFilePath())
		)
	}
	transformSnipStatementComments(sourceFile)
	sourceFile.refreshFromFileSystem()
	return sourceFile.getFullText()
}

// Replace relative internal imports with standard external imports
export const transformRelativeImports = (
	sourceFile: SourceFile,
	packageRoot: string
) => {
	const packageJson = readPackageJson(packageRoot)
	const importDeclarations = sourceFile.getDescendantsOfKind(
		SyntaxKind.ImportDeclaration
	)
	for (const declaration of importDeclarations) {
		const specifier = declaration.getModuleSpecifier()
		if (specifier.getLiteralText().endsWith("main.js")) {
			specifier.replaceWithText(`"${packageJson.name}"`)
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
