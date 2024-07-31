import type { ArkErrors } from "@ark/schema"
import type { inferred } from "./ast.js"
import type { GenericHktParser } from "./generic.js"
import type { arkGenericsExports } from "./keywords/arkGenerics.js"
import type { formattingExports } from "./keywords/format.js"
import type { internalExports } from "./keywords/internal.js"
import type { jsObjectExports } from "./keywords/jsObjects.js"
import type { parsingExports } from "./keywords/parsing.js"
import type { platformObjectExports } from "./keywords/platformObjects.js"
import type { tsGenericsExports } from "./keywords/tsGenerics.js"
import type { tsKeywordExports } from "./keywords/tsKeywords.js"
import type { typedArrayExports } from "./keywords/typedArray.js"
import type { validationExports } from "./keywords/validation.js"
import type { MatchParser } from "./match.js"
import type { Module } from "./module.js"
import { scope, type Scope } from "./scope.js"
import type { DeclarationParser, DefinitionParser, TypeParser } from "./type.js"

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsKeywordExports,
		jsObjectExports,
		platformObjectExports,
		validationExports,
		// tsGenericsExports,
		arkGenericsExports,
		internalExports {
	TypedArray: Module<typedArrayExports>
	parse: Module<parsingExports>
	format: Module<formattingExports>
}

export const ambient: Scope<Ark> = scope({}) as never

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
