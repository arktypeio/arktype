import { type inferred } from "@arktype/schema"
import { type MatchParser, type WhenParser } from "../match.ts"
import type { Module, ScopeParser } from "../scope.ts"
import { Scope } from "../scope.ts"
import type {
	DeclarationParser,
	DefinitionParser,
	TypeParser
} from "../type.ts"
import type { InferredJsObjects } from "./jsObjects.ts"
import { jsObjectsModule } from "./jsObjects.ts"
import type { ParsingModule } from "./parsing.ts"
import { parsingModule } from "./parsing.ts"
import { type InferredTsGenerics, tsGenericsModule } from "./tsGenerics.ts"
import type { InferredTsKeywords } from "./tsKeywords.ts"
import { tsKeywordsModule } from "./tsKeywords.ts"
import type { InferredValidation } from "./validation.ts"
import { validationModule } from "./validation.ts"

/** Root scopes can be inferred automatically from node definitions, but
 * explicitly typing them can improve responsiveness */
export type RootScope<exports> = Scope<{
	exports: exports
	locals: {}
	ambient: {}
}>

export type ArkResolutions = { exports: Ark; locals: {}; ambient: Ark }

export const ark: Scope<ArkResolutions> = Scope.root({
	...tsKeywordsModule,
	...jsObjectsModule,
	...validationModule,
	parse: parsingModule,
	// again, unfortunately TS won't handle comparing generics well here, so we
	// have to cast. that said, since each individual root scope is checked,
	// this is low risk
	...tsGenericsModule
}).toAmbient() as never

export const arktypes: Module<ArkResolutions> = ark.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends InferredTsKeywords,
		InferredJsObjects,
		InferredValidation,
		InferredTsGenerics {
	parse: ParsingModule
}

export const scope: ScopeParser<{}, Ark> = ark.scope as never

export const type: TypeParser<Ark> = ark.type

export const match: MatchParser<Ark> = ark.match

export const when: WhenParser<Ark> = ark.when

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}

export const define: DefinitionParser<Ark> = ark.define

export const declare: DeclarationParser<Ark> = ark.declare
