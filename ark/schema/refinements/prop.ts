import { IndexNode, type IndexDeclaration } from "./index.js"
import { OptionalNode, type OptionalDeclaration } from "./optional.js"
import { RequiredNode, type RequiredDeclaration } from "./required.js"
import { SequenceNode, type SequenceDeclaration } from "./sequence.js"

export type PropDeclarations = {}

export const PropNodes = {
	required: RequiredNode,
	optional: OptionalNode,
	index: IndexNode,
	sequence: SequenceNode
}
