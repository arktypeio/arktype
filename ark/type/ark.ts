import {
	keywordNodes,
	type Ark,
	type ArkErrors,
	type inferred
} from "@ark/schema"
import type { CastableBase } from "@ark/util"
import type { GenericHktParser } from "./generic.js"
import type { MatchParser } from "./match.js"
import type { Module } from "./module.js"
import { scope, type Scope } from "./scope.js"
import type {
	DeclarationParser,
	DefinitionParser,
	Type,
	TypeParser
} from "./type.js"

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

export const generic: GenericHktParser<{}> = ambient.generic as never

export const match: MatchParser<{}> = ambient.match as never

export const define: DefinitionParser<{}> = ambient.define as never

export const declare: DeclarationParser<{}> = ambient.declare as never
