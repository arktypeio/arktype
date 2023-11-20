import type { CompilationConfig } from "../io/compile.js"
import {
	IntersectionImplementation,
	type IntersectionDeclaration
} from "./intersection.js"
import { MorphImplementation, type MorphDeclaration } from "./morph.js"
import { UnionImplementation, type UnionDeclaration } from "./union.js"

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

export type SetAttachments = {
	compile: (ctx: CompilationConfig) => string
}
