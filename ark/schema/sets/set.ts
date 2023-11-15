import type { CompilationConfig } from "../io/compile.ts"
import {
	IntersectionImplementation,
	type IntersectionDeclaration
} from "./intersection.ts"
import { MorphImplementation, type MorphDeclaration } from "./morph.ts"
import { UnionImplementation, type UnionDeclaration } from "./union.ts"

export type SetDeclarationsByKind = {
	union: UnionDeclaration
	morph: MorphDeclaration
	intersection: IntersectionDeclaration
}

export const SetImplementationByKind = {
	union: UnionImplementation,
	morph: MorphImplementation,
	intersection: IntersectionImplementation
}

export type SetKind = keyof SetDeclarationsByKind

export type SetAttachments = {
	compile: (ctx: CompilationConfig) => string
}
