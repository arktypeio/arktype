import type { Ark, inferred } from "@arktype/schema"
import type { Generic } from "./generic.js"
import type { MatchParser } from "./match.js"
import { type Module, type Scope, scope } from "./scope.js"
import type { DeclarationParser, DefinitionParser, TypeParser } from "./type.js"

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

export const tsGenerics = {} as Module<TsGenericsExports>

export const ark: Scope<Ark> = scope({}) as never

export const keywords: Module<Ark> = ark.export()

export const type: TypeParser<{}> = ark.type as never

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}

export const match: MatchParser<{}> = ark.match as never

export const define: DefinitionParser<{}> = ark.define as never

export const declare: DeclarationParser<{}> = ark.declare as never
