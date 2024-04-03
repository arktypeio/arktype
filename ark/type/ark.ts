import type { ambient, Ark, inferred } from "@arktype/schema"
import type { MatchParser } from "./match.js"
import { scope, type Module, type Scope } from "./scope.js"
import type {
	DeclarationParser,
	DefinitionParser,
	Generic,
	TypeParser
} from "./type.js"

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

export const type: TypeParser<ambient> = ark.type

export namespace type {
	export type cast<to> = {
		[inferred]?: to
	}
}

export const match: MatchParser<Ark> = ark.match

export const define: DefinitionParser<Ark> = ark.define

export const declare: DeclarationParser<Ark> = ark.declare
