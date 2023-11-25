import {
	JsObjects,
	TsKeywords,
	Validation,
	type inferred
} from "@arktype/schema"
import { Scope } from "./scope.js"

/** Root scopes can be inferred automatically from node definitions, but
 * explicitly typing them can improve responsiveness */
export type RootScope<exports> = Scope<{
	exports: exports
	locals: {}
	ambient: {}
}>

export type ArkResolutions = { exports: Ark; locals: {}; ambient: Ark }

export const ark = Scope.root({
	...TsKeywords.resolutions,
	...JsObjects.resolutions,
	...Validation.resolutions
}).toAmbient()

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}

// export const arktypes: Module<ArkResolutions> = ark.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends TsKeywords.infer,
		JsObjects.infer,
		Validation.infer {
	// parse: ParsingModule
}

// export const scope: ScopeParser<{}, Ark> = ark.scope as never

// export const type: TypeParser<Ark> = ark.type

// export const match: MatchParser<Ark> = ark.match

// export const when: WhenParser<Ark> = ark.when

// export namespace type {
// 	export type cast<to> = {
// 		[inferred]?: to
// 	}
// }

// export const define: DefinitionParser<Ark> = ark.define

// export const declare: DeclarationParser<Ark> = ark.declare
