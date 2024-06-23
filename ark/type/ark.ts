import {
	keywordNodes,
	type Ark,
	type ArkErrors,
	type inferred
} from "@arktype/schema"
import type { CastableBase } from "@arktype/util"
import type { Generic } from "./generic.js"
import type { MatchParser } from "./match.js"
import type { Module } from "./module.js"
import { scope, type Scope } from "./scope.js"
import type {
	DeclarationParser,
	DefinitionParser,
	Type,
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

export const ambient: Scope<Ark> = scope(keywordNodes) as never

export const ark: Module<Ark> = ambient.export()

export const type: TypeParser<{}> = ambient.type as never

export namespace type {
	export type cast<t> = {
		[inferred]?: t
	}

	export type errors = ArkErrors

	export interface of<t, $ = {}> extends Type<t, $> {}

	export interface infer<t extends Type<object>>
		extends CastableBase<t["infer"]> {}

	export interface inferIn<t extends Type<object>>
		extends CastableBase<t["inferIn"]> {}
}

export const match: MatchParser<{}> = ambient.match as never

export const define: DefinitionParser<{}> = ambient.define as never

export const declare: DeclarationParser<{}> = ambient.declare as never
