import type { MatchParser } from "../match.js"
import type { NodeParser, SchemaParser } from "../schema.js"
import { type Module, type Scope, type ScopeParser } from "../scope.js"
import type { inferred } from "../shared/inference.js"
import type {
	DeclarationParser,
	DefinitionParser,
	Generic,
	TypeParser
} from "../type.js"
import { JsObjects } from "./jsObjects.js"
import { Parsing } from "./parsing.js"
import { root } from "./root.js"
import { TsKeywords } from "./tsKeywords.js"
import { Validation } from "./validation.js"

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
	exports: Parsing.infer
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
		...TsKeywords.export(),
		...JsObjects.export(),
		...Validation.export(),
		// TODO: fix
		...tsGenerics,
		parse: Parsing.export()
	})
	.toAmbient() as never

export const keywords: Module<ArkResolutions> = ark.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends TsKeywords.infer,
		JsObjects.infer,
		Validation.infer,
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
