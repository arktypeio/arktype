// the import ordering here is important so builtin keywords can be resolved
// and used to bootstrap nodes with constraints
import { tsKeywords, type tsKeywordExports } from "./tsKeywords.js"

import { $ark } from "@ark/util"
import type { Module } from "../module.js"
import { scope, type Scope } from "../scope.js"
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

$ark.ambient = ambientRootScope.internal

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
