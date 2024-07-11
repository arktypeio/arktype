import type { RootModule, SchemaModule } from "../module.js"
import { schemaScope, type RootScope } from "../scope.js"
// the import ordering here is important so builtin keywords can be resolved
// and used to bootstrap nodes with constraints
import { tsKeywords, type tsKeywordExports } from "./tsKeywords.js"

import { formatting, type formattingExports } from "./format.js"
import { internal, type internalExports } from "./internal.js"
import { jsObjects, type jsObjectExports } from "./jsObjects.js"
import { parsing, type parsingExports } from "./parsing.js"
import { tsGenerics, type tsGenericsExports } from "./tsGenerics.js"
import { validation, type validationExports } from "./validation.js"

export const ambientRootScope: RootScope<Ark> = schemaScope({
	...tsKeywords,
	...jsObjects,
	...validation,
	...internal,
	...tsGenerics,
	parse: parsing,
	format: formatting
	// TODO: remove cast
}) as never

$ark.ambient = ambientRootScope.internal

export const keywordNodes: SchemaModule<Ark> = ambientRootScope.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsKeywordExports,
		jsObjectExports,
		validationExports,
		tsGenericsExports,
		internalExports {
	parse: RootModule<parsingExports>
	format: RootModule<formattingExports>
}
