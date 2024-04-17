import { type Ark, type inferred, keywordNodes } from "@arktype/schema"
import type { Generic } from "./generic.js"
import type { MatchParser } from "./match.js"
import type { Module } from "./module.js"
import { type Scope, scope } from "./scope.js"
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

export const ambient: Scope<Ark> = scope(keywordNodes) as never

$ark.ambient = ambient

export const ark: Module<Ark> = ambient.export()

export const type: TypeParser<{}> = ambient.type.bind(ambient) as never

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}

export const match: MatchParser<{}> = ambient.match.bind(ambient) as never

export const define: DefinitionParser<{}> = ambient.define.bind(
	ambient
) as never

export const declare: DeclarationParser<{}> = ambient.declare.bind(
	ambient
) as never
