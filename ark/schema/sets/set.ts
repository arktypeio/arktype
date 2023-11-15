import { type CompilationConfig } from "../io/compile.ts"
import {
	type IntersectionDeclaration,
	IntersectionImplementation
} from "./intersection.ts"
import { type MorphDeclaration, MorphImplementation } from "./morph.ts"
import { type UnionDeclaration, UnionImplementation } from "./union.ts"

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

export const setKinds = [
	"union",
	"morph",
	"intersection"
] as const satisfies readonly SetKind[]

export type SetAttachments = {
	compile: (ctx: CompilationConfig) => string
}
