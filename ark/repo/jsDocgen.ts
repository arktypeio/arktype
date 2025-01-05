import { fromHere } from "@ark/fs"
import {
	Project,
	type Identifier,
	type JSDocableNode,
	type Node
} from "ts-morph"
import ts from "typescript"

const file = "/home/ssalb/arktype/ark/type/methods/base.ts"

let project: Project | undefined

export const jsDocgen = () => {
	project ??= new Project({
		tsConfigFilePath: fromHere("../../tsconfig.json")
	})

	const sourceFile = project.getSourceFileOrThrow(file)

	const identifiers = sourceFile
		.getDescendants()
		.filter(
			(node): node is Identifier =>
				!!node.asKind(ts.SyntaxKind.Identifier)?.getLeadingCommentRanges()
					.length
		)

	for (const identifier of identifiers) {
		for (const comment of identifier.getLeadingCommentRanges()) {
			const text = comment.getText()
			const match = text.match(/@docFrom\s+(\w+):\s*(.*)/)

			if (!match) continue

			const sourceName = match[1]
			const ownDescription = match[2]

			const sourceDeclaration = sourceFile
				.getDescendantsOfKind(ts.SyntaxKind.Identifier)
				.find(i => i.getText() === sourceName)
				?.getDefinitions()[0]
				.getDeclarationNode()

			if (!sourceDeclaration || !canHaveJsDoc(sourceDeclaration)) continue

			const sourceDescription = sourceDeclaration
				.getJsDocs()[0]
				.getDescription()

			const parent = identifier.getParent()
			if (canHaveJsDoc(parent)) {
				parent.addJsDoc({
					description: `${ownDescription}\n${sourceDescription}`
				})

				sourceFile.saveSync()
			}
		}
	}
}

const canHaveJsDoc = (node: Node): node is Node & JSDocableNode =>
	"addJsDoc" in node
