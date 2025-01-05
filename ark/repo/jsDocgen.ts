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

	console.log(`📚 Successfully generated JSDoc for ${docgenCount} build files.`)
}

const docgenForFile = (sourceFile: SourceFile) => {
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

			const lastNonWhitespaceIndex = prefix.trimEnd().length - 1
			const lastNonWhitespaceChar = prefix[lastNonWhitespaceIndex]

			if (lastNonWhitespaceChar !== "{") {
				throwParseError(
					`Expected '{' before @inheritDoc but got '${lastNonWhitespaceChar}'`
				)
			}

			const updatedPrefix = prefix.slice(0, lastNonWhitespaceIndex)

			const textFollowingOpenTag = text
				.slice(tokenStartIndex + inheritDocToken.length)
				.trimStart()

			if (textFollowingOpenTag[0] !== "}") {
				throwParseError(
					`Expected '}' after @inheritDoc but got '${textFollowingOpenTag[0]}'`
				)
			}

			const textFollowingToken = textFollowingOpenTag.slice(1)

			const maybeBlockEndIndex = textFollowingToken.indexOf("*")
			const blockEndIndex =
				maybeBlockEndIndex === -1 ?
					textFollowingToken.length
				:	maybeBlockEndIndex

			// extract the text until whitespace or block comment end (*)
			const sourceName = textFollowingToken.slice(0, blockEndIndex)

			return {
				sourceName,
				updatedPrefix,
				ownDescription: "",
				identifier,
				comment
			}
		})
	)

	matchContexts.forEach(
		({ sourceName, ownDescription, identifier, comment }) => {
			const sourceDeclaration = sourceFile
				.getDescendantsOfKind(ts.SyntaxKind.Identifier)
				.find(i => i.getText() === sourceName)
				?.getDefinitions()[0]
				.getDeclarationNode()

			if (!sourceDeclaration || !canHaveJsDoc(sourceDeclaration)) return

			const parent = identifier.getParent()
			parent.replaceWithText(parent.getText().replace(comment.getText(), ""))

			const sourceDescription = sourceDeclaration
				.getJsDocs()[0]
				.getDescription()

			if (canHaveJsDoc(parent)) {
				const description = `${ownDescription}\n${sourceDescription}`
				parent.addJsDocs([
					{
						description
					}
				])
				docgenCount++
			}
		}
	)
}

const canHaveJsDoc = (node: Node): node is Node & JSDocableNode =>
	"addJsDoc" in node
