import {
	IntersectionNode,
	type IntersectionDeclaration
} from "./intersection.js"
import { MorphNode, type MorphDeclaration } from "./morph.js"
import { UnionNode, type UnionDeclaration } from "./union.js"

export type SetDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
}

export const SetNodesByKind = {
	union: UnionNode,
	morph: MorphNode,
	intersection: IntersectionNode
}
