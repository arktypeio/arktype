import { IndexNode, type IndexDeclaration } from "./index.js"
import { OptionalNode, type OptionalDeclaration } from "./optional.js"
import { RequiredNode, type RequiredDeclaration } from "./required.js"

export type PropDeclarations = {
	required: RequiredDeclaration
	optional: OptionalDeclaration
	index: IndexDeclaration
}

export const PropNodes = {
	required: RequiredNode,
	optional: OptionalNode,
	index: IndexNode
}
