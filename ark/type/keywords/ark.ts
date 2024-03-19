import type { MatchParser } from "../match.js"
import type { NodeParser, SchemaParser } from "../schema.js"
import type { Module, Scope, ScopeParser } from "../scope.js"
import type { inferred } from "../shared/inference.js"
import type {
	DeclarationParser,
	DefinitionParser,
	Generic,
	TypeParser
} from "../type.js"
// we don't need these for the base scope, but we import them here so we
// register the keywords for internal use
import "./internal.js"
// this needs to be imported before `jsObects` so jsObects can bootstrap corrrectly
import { tsPrimitiveKeywords, type tsPrimitive } from "./tsPrimitive.js"

import { jsObjectKeywords, type jsObject } from "./jsObject.js"
import { parsingKeywords, type parsing } from "./parsing.js"
import { root } from "./root.js"
import { validationKeywords, type validation } from "./validation.js"

/** Root scopes can be inferred automatically from node definitions, but
 * explicitly typing them can improve responsiveness */
export type RootScope<exports> = Scope<{
	exports: exports
	locals: {}
	ambient: {}
}>

export type ArkResolutions = { exports: Ark; locals: {}; ambient: Ark }

// For some reason if we try to inline this, it gets evaluated and the module
// can't be inferred
export type ParsingResolutions = {
	exports: parsing.infer
	locals: {}
	ambient: {}
}

export type TsGenericsResolutions<$ = Ark> = {
	exports: TsGenericsExports<$>
	locals: {}
	ambient: {}
}

type TsGenericsExports<$ = Ark> = {
	Record: Generic<
		["K", "V"],
		{
			"[K]": "V"
		},
		// as long as the generics in the root scope don't reference one
		// another, they shouldn't need a bound local scope
		$
	>
}

export const tsGenerics = {} as Module<TsGenericsResolutions>

export const ark: Scope<ArkResolutions> = root
	.scope({
		...tsPrimitiveKeywords,
		...jsObjectKeywords,
		...validationKeywords,
		// TODO: fix
		...tsGenerics,
		parse: parsingKeywords
	})
	.toAmbient() as never

export const keywords: Module<ArkResolutions> = ark.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsPrimitive.infer,
		jsObject.infer,
		validation.infer,
		TsGenericsExports {
	parse: Module<ParsingResolutions>
}

export const scope: ScopeParser<Ark, Ark> = ark.scope as never

export const type: TypeParser<Ark> = ark.type

export const match: MatchParser<Ark> = ark.match

export const schema: SchemaParser<Ark> = ark.schema

export const node: NodeParser<Ark> = ark.node

export const define: DefinitionParser<Ark> = ark.define

export const declare: DeclarationParser<Ark> = ark.declare

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}
