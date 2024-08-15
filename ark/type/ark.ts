import type { ArkErrors } from "@ark/schema"
import type { inferred } from "./ast.js"
import type { GenericHktParser } from "./generic.js"
import { arkGenerics, type arkGenericsExports } from "./keywords/arkGenerics.js"
import { formatting, type formattingExports } from "./keywords/format.js"
import { internal, type internalExports } from "./keywords/internal.js"
import { jsObjects, type jsObjectExports } from "./keywords/jsObjects.js"
import { parsing, type parsingExports } from "./keywords/parsing.js"
import {
	platformObjects,
	type platformObjectExports
} from "./keywords/platformObjects.js"
import { tsGenerics, type tsGenericsExports } from "./keywords/tsGenerics.js"
import { tsKeywords, type tsKeywordExports } from "./keywords/tsKeywords.js"
import { typedArray, type typedArrayExports } from "./keywords/typedArray.js"
import { validation, type validationExports } from "./keywords/validation.js"
import type { Module, Submodule } from "./module.js"
import { scope, type Scope } from "./scope.js"
import type { DeclarationParser, DefinitionParser, TypeParser } from "./type.js"

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsKeywordExports,
		jsObjectExports,
		platformObjectExports,
		validationExports,
		tsGenericsExports,
		arkGenericsExports,
		internalExports {
	TypedArray: Submodule<typedArrayExports>
	parse: Submodule<parsingExports>
	format: Submodule<formattingExports>
}

export const ambient: Scope<Ark> = scope(
	{
		...tsKeywords,
		...jsObjects,
		...platformObjects,
		...validation,
		...internal,
		...tsGenerics,
		...arkGenerics,
		TypedArray: typedArray,
		parse: parsing,
		format: formatting
	},
	{ prereducedAliases: true, ambient: true }
) as never

export const ark: Module<Ark> = ambient.export()

export const type: TypeParser<{}> = ambient.type as never

export declare namespace type {
	export type cast<t> = {
		[inferred]?: t
	}

	export type errors = ArkErrors
}

export const generic: GenericHktParser<{}> = ambient.generic as never

export const define: DefinitionParser<{}> = ambient.define as never

export const declare: DeclarationParser<{}> = ambient.declare as never
