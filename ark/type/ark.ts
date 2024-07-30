import type { ArkErrors, inferred } from "@ark/schema"
import type { GenericHktParser } from "./generic.js"
import { keywordNodes, type Ark } from "./keywords/keywords.js"
import type { MatchParser } from "./match.js"
import type { Module } from "./module.js"
import { scope, type Scope } from "./scope.js"
import type { DeclarationParser, DefinitionParser, TypeParser } from "./type.js"

export const ambient: Scope<Ark> = scope(keywordNodes) as never

export const ark: Module<Ark> = ambient.export()

export const type: TypeParser<{}> = ambient.type as never

export namespace type {
	export type cast<t> = {
		[inferred]?: t
	}

	export type errors = ArkErrors
}

export const generic: GenericHktParser<{}> = ambient.generic as never

export const match: MatchParser<{}> = ambient.match as never

export const define: DefinitionParser<{}> = ambient.define as never

export const declare: DeclarationParser<{}> = ambient.declare as never
