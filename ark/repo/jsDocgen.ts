import { fromHere } from "@ark/fs"
import { existsSync } from "fs"
import { join, relative } from "path"
import {
	Project,
	type Identifier,
	type JSDocableNode,
	type Node,
	type SourceFile
} from "ts-morph"
import ts from "typescript"
import { repoDirs } from "./shared.ts"

const docFromToken = "@docFrom"

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

			if (!text.includes(docFromToken)) return []

			const docFromIndex = text.indexOf(docFromToken)
			const afterDocFrom = text
				.slice(docFromIndex + docFromToken.length)
				.trimStart()

			const splitIndex = afterDocFrom.indexOf(":")
			const maybeBlockEndIndex = afterDocFrom.indexOf("*")
			const blockEndIndex =
				maybeBlockEndIndex === -1 ? afterDocFrom.length : maybeBlockEndIndex

			let sourceName: string
			let ownDescription: string

			if (splitIndex === -1) {
				// if there's no colon, extract the text until whitespace or
				// block comment end (*)
				sourceName = afterDocFrom.slice(0, blockEndIndex)
				ownDescription = ""
			} else {
				// otherwise, extract and trim text until the colon
				sourceName = afterDocFrom.slice(0, splitIndex).trim()
				ownDescription = afterDocFrom
					.slice(splitIndex + 1, blockEndIndex)
					.trim()
			}

			return {
				sourceName,
				ownDescription,
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
