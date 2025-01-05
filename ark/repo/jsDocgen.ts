import { throwParseError } from "@ark/util"
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

let docgenCount = 0

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

	project.saveSync()

	// const rewriteEntries = entriesOf(filesToRewrite)

	// rewriteEntries.forEach(([path, contents]) => writeFile(path, contents))

	console.log(
		`📚 Successfully generated ${docgenCount} JSDoc comments on your build output.`
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

			const sourceName = textFollowingOpenTag.slice(0, innerTagLength).trim()

			return {
				sourceName,
				identifier
			}
		})
	)

	matchContexts.forEach(({ sourceName, identifier }) => {
		const sourceDeclaration = sourceFile
			.getDescendantsOfKind(ts.SyntaxKind.Identifier)
			.find(i => i.getText() === sourceName)
			?.getDefinitions()[0]
			.getDeclarationNode()

		if (!sourceDeclaration || !canHaveJsDoc(sourceDeclaration)) return

		const parent = identifier.getParent()

		if (!canHaveJsDoc(parent)) return

		const matchedJsdoc = parent.getJsDocs()[0]

		const matchedDescription = matchedJsdoc.getDescription()

		const inheritedDescription = sourceDeclaration
			.getJsDocs()[0]
			.getDescription()

		let updatedContents = ""

		const matchedSummary = matchedDescription
			.slice(0, matchedDescription.indexOf("{"))
			.trim()

		if (matchedSummary) updatedContents += `${matchedSummary}\n`

		updatedContents += `${inheritedDescription}`

		// replace the original JSDoc node in the AST with a new one
		// created from updatedContents
		matchedJsdoc.remove()
		parent.addJsDoc(updatedContents)
		docgenCount++
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
