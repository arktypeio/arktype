import {
	Project,
	type Identifier,
	type JSDocableNode,
	type Node
} from "ts-morph"
import ts from "typescript"

const file = "/home/ssalb/arktype/ark/type/out/methods/base.d.ts"

let project: Project | undefined

const docFromToken = "@docFrom"

export const jsDocgen = () => {
	project ??= new Project()

	project.addSourceFileAtPath(file)
	const sourceFile = project.getSourceFileOrThrow(file)

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
				parent.addJsDocs([
					{
						description: `${ownDescription}\n${sourceDescription}`
					}
				])
			}
		}
	)

	project.saveSync()
}

const canHaveJsDoc = (node: Node): node is Node & JSDocableNode =>
	"addJsDoc" in node
