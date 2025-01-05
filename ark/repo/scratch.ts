import { fromHere } from "@ark/fs"
import {
	Project,
	type Identifier,
	type JSDocableNode,
	type Node
} from "ts-morph"
import ts from "typescript"

const project = new Project({
	tsConfigFilePath: fromHere("../../tsconfig.json")
})

interface DocRef {
	node: Node
	sourceName: string
	desc: string
}

const canHaveJsDoc = (node: Node): node is Node & JSDocableNode => {
	return "addJsDoc" in node
}

const findRefs = (file: string): DocRef[] => {
	const sourceFile = project.getSourceFileOrThrow(file)
	const refs: DocRef[] = []

	// Get all nodes with leading comments
	const identifiers = sourceFile
		.getDescendants()
		.filter(
			(node): node is Identifier =>
				!!node.asKind(ts.SyntaxKind.Identifier)?.getLeadingCommentRanges()
					.length
		)

	for (const identifier of identifiers) {
		// Check each comment for @docFrom
		for (const comment of identifier.getLeadingCommentRanges()) {
			const text = comment.getText()
			const match = text.match(/@docFrom\s+(\w+):\s*(.*)/)

			if (!match) continue

			const sourceName = match[1]
			const ownDescription = match[2]

			const sourceDeclaration = sourceFile
				.getDescendantsOfKind(ts.SyntaxKind.Identifier)
				.find(i => i.getText() === "UndeclaredKeyBehavior")
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

				console.log(parent.getJsDocs()[0].getDescription())
			}
		}
	}

	return refs
}

const refs = findRefs("/home/ssalb/arktype/ark/type/methods/base.ts")
