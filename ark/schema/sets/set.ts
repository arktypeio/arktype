import { type IntersectionDeclaration } from "./intersection.js"
import { type MorphDeclaration } from "./morph.js"
import { type UnionDeclaration } from "./union.js"

export type SetDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
}

export type SetKind = keyof SetDeclarationsByKind
