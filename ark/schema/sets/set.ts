import {
	type IntersectionDeclaration,
	type IntersectionNode
} from "./intersection.js"
import { type MatchDeclaration } from "./match.js"
import { type MorphDeclaration, type MorphNode } from "./morph.js"
import { type UnionDeclaration, type UnionNode } from "./union.js"

export type SetDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
	match: MatchDeclaration
}

export type SetClassesByKind = {
	union: typeof UnionNode
	morph: typeof MorphNode
	intersection: typeof IntersectionNode
	match: typeof Match
}

export type SetKind = keyof SetDeclarationsByKind
