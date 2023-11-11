import { type CompilationConfig } from "../io/compile.ts"
import {
	type IntersectionDeclaration,
	type IntersectionImplementation
} from "./intersection.ts"
import { type MorphDeclaration, type MorphImplementation } from "./morph.ts"
import { type UnionDeclaration, type UnionImplementation } from "./union.ts"

export type SetDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
}

export type SetImplementationByKind = {
	union: typeof UnionImplementation
	morph: typeof MorphImplementation
	intersection: typeof IntersectionImplementation
}

export type SetKind = keyof SetDeclarationsByKind

export type SetAttachments = {
	compile: (ctx: CompilationConfig) => string
}
