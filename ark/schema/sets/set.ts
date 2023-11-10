import {
	type IntersectionDeclaration,
	type IntersectionImplementation
} from "./intersection.js"
import { type MorphDeclaration, type MorphImplementation } from "./morph.js"
import { type UnionDeclaration, type UnionImplementation } from "./union.js"

export type SetDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
}

export type SetClassesByKind = {
	union: typeof UnionImplementation
	morph: typeof MorphImplementation
	intersection: typeof IntersectionImplementation
}

export type SetKind = keyof SetDeclarationsByKind
