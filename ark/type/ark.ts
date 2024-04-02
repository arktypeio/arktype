import type {
	inferred,
	jsObjects,
	parsing,
	tsKeywords,
	validation
} from "@arktype/schema"
import type { MatchParser } from "./match.js"
import { Scope, type Module, type ScopeParser } from "./scope.js"
import type {
	DeclarationParser,
	DefinitionParser,
	Generic,
	TypeParser
} from "./type.js"

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
	exports: parsing.exports
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

declare global {
	export interface StaticArkConfig {
		ambient(): Ark
	}
}

export type ambient = ReturnType<StaticArkConfig["ambient"]>

export const ark: Scope<ArkResolutions> = Scope.root({
	...keywords,
	parse: parsingKeywords
}).toAmbient() as never

export const keywords: Module<ArkResolutions> = ark.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsKeywords.exports,
		jsObjects.exports,
		validation.exports,
		TsGenericsExports {
	parse: Module<ParsingResolutions>
}

export const scope: ScopeParser<Ark> = ark.scope as never

export const type: TypeParser<ambient> = ark.type

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}

export const match: MatchParser<Ark> = ark.match

export const define: DefinitionParser<Ark> = ark.define

export const declare: DeclarationParser<Ark> = ark.declare
