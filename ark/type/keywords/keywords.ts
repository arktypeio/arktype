// the import ordering here is important so builtin keywords can be resolved
// and used to bootstrap nodes with constraints
import { tsKeywords, type tsKeywordExports } from "./tsKeywords.js"

import type { ArkErrors } from "@ark/schema"
import type { inferred } from "../ast.js"
import type { GenericHktParser } from "../generic.js"
import type { MatchParser } from "../match.js"
import type { Module } from "../module.js"
import { scope, type Scope } from "../scope.js"
import type {
	DeclarationParser,
	DefinitionParser,
	TypeParser
} from "../type.js"
import { arkGenerics, type arkGenericsExports } from "./arkGenerics.js"
import { formatting, type formattingExports } from "./format.js"
import { jsObjects, type jsObjectExports } from "./jsObjects.js"
import { parsing, type parsingExports } from "./parsing.js"
import {
	platformObjects,
	type platformObjectExports
} from "./platformObjects.js"
import { tsGenerics, type tsGenericsExports } from "./tsGenerics.js"
import { typedArray, type typedArrayExports } from "./typedArray.js"
import { validation, type validationExports } from "./validation.js"

export const ambientRootScope: Scope<Ark> = scope({
	...tsKeywords,
	...jsObjects,
	...platformObjects,
	...validation,
	...tsGenerics,
	...arkGenerics,
	TypedArray: typedArray,
	parse: parsing,
	format: formatting
}) as never

export const keywordNodes: Module<Ark> = ambientRootScope.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsKeywordExports,
		jsObjectExports,
		platformObjectExports,
		validationExports,
		tsGenericsExports,
		arkGenericsExports {
	TypedArray: Module<typedArrayExports>
	parse: Module<parsingExports>
	format: Module<formattingExports>
}

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
