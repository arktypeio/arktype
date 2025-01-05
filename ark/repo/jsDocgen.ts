import { writeFile } from "@ark/fs"
import { entriesOf, throwParseError } from "@ark/util"
import { existsSync } from "fs"
import { join } from "path"
import {
	Project,
	type Identifier,
	type JSDocableNode,
	type Node,
	type SourceFile
} from "ts-morph"
import ts from "typescript"
import { repoDirs } from "./shared.ts"

const inheritDocToken = "@inheritDoc"

const arkTypeBuildDir = join(repoDirs.arkDir, "type", "out")

const filesToRewrite: { [path: string]: string } = {}

export const jsDocgen = () => {
	const project = new Project()

	if (!existsSync(arkTypeBuildDir)) {
		throw new Error(
			`jsDocgen rewrites ${arkTypeBuildDir} but that directory doesn't exist. Did you run "pnpm build" there first?`
		)
	}

	project.addSourceFilesAtPaths(`${arkTypeBuildDir}/**/*.d.ts`)

	const sourceFiles = project.getSourceFiles()

	console.log(
		`✍️ Generating JSDoc for ${sourceFiles.length} files in ${arkTypeBuildDir}...`
	)

	project.getSourceFiles().forEach(docgenForFile)

	const rewriteEntries = entriesOf(filesToRewrite)

	rewriteEntries.forEach(([path, contents]) => writeFile(path, contents))

	console.log(
		`📚 Successfully generated JSDoc for ${rewriteEntries.length} build files.`
	)
}

const docgenForFile = (sourceFile: SourceFile) => {
	const path = sourceFile.getFilePath()
	const identifiers = sourceFile
		.getDescendants()
		.filter(
			(node): node is Identifier =>
				!!node.asKind(ts.SyntaxKind.Identifier)?.getLeadingCommentRanges()
					.length
		)

	const matchContexts = identifiers.flatMap(identifier =>
		identifier.getLeadingCommentRanges().flatMap(comment => {
			const text = comment.getText()

			if (!text.includes(inheritDocToken)) return []

			const tokenStartIndex = text.indexOf(inheritDocToken)
			const prefix = text.slice(0, tokenStartIndex)

			const openBraceIndex = prefix.trimEnd().length - 1

			if (text[openBraceIndex] !== "{") {
				throwJsDocgenParseError(
					path,
					text,
					` Expected '{' before @inheritDoc but got '${text[openBraceIndex]}'`
				)
			}

			const openTagEndIndex = tokenStartIndex + inheritDocToken.length

			const textFollowingOpenTag = text.slice(openTagEndIndex)

			const innerTagLength = textFollowingOpenTag.indexOf("}")

			if (innerTagLength === -1) {
				throwJsDocgenParseError(
					path,
					text,
					`Expected '}' after @inheritDoc but got '${textFollowingOpenTag[0]}'`
				)
			}

			const closeBraceIndex = openTagEndIndex + innerTagLength

			const textToReplace = text.slice(openBraceIndex, closeBraceIndex + 1)

			const sourceName = textFollowingOpenTag.slice(0, innerTagLength).trim()

			return {
				sourceName,
				textToReplace,
				identifier
			}
		})
	)

	matchContexts.forEach(({ sourceName, textToReplace, identifier }) => {
		const sourceDeclaration = sourceFile
			.getDescendantsOfKind(ts.SyntaxKind.Identifier)
			.find(i => i.getText() === sourceName)
			?.getDefinitions()[0]
			.getDeclarationNode()

		if (!sourceDeclaration || !canHaveJsDoc(sourceDeclaration)) return

		const parent = identifier.getParent()

		const sourceDescription = sourceDeclaration.getJsDocs()[0].getDescription()

		if (canHaveJsDoc(parent)) {
			const inheritedDescription = sourceDeclaration
				.getJsDocs()[0]
				.getDescription()

			const description = `${ownDescription}\n${inheritedDescription}`
			parent.addJsDocs([
				{
					description
				}
			])
		}

		if (canHaveJsDoc(parent)) {
			const file = parent.getSourceFile()
			const path = file.getFilePath()
			filesToRewrite[path] ??= file.getText()
			const originalText = filesToRewrite[path]

			filesToRewrite[path] = originalText.replace(
				textToReplace,
				sourceDescription
			)
		}
	})
}

const canHaveJsDoc = (node: Node): node is Node & JSDocableNode =>
	"addJsDoc" in node

const throwJsDocgenParseError = (
	path: string,
	commentText: string,
	message: string
): never =>
	throwParseError(
		`jsDocgen ParseError in ${path}: ${message}\nComment text: ${commentText}`
	)
