import type { GenericRoot } from "../generic.js"
import type { RootModule, SchemaModule } from "../module.js"
import { RawRootScope, schemaScope, type RootScope } from "../scope.js"
// the import ordering here is important so builtin keywords can be resolved
// and used to bootstrap nodes with constraints
import { tsKeywords, type tsKeywordExports } from "./tsKeywords.js"

import { jsObjects, type jsObjectExports } from "./jsObjects.js"
import { parsing, type parsingExports } from "./parsing.js"
import { validation, type validationExports } from "./validation.js"

type TsGenericsExports<$ = Ark> = {
	Record: GenericRoot<
		["K", "V"],
		{
			"[K]": "V"
		},
		// as long as the generics in the root scope don't reference one
		// another, they shouldn't need a bound local scope
		$
	>
}

export const ambientRootScope: RootScope<Ark> = schemaScope({
	...tsKeywords,
	...jsObjects,
	...validation,
	parse: parsing
	// TODO: remove cast
}) as never

RawRootScope.ambient = ambientRootScope.raw

export const keywordNodes: SchemaModule<Ark> = ambientRootScope.export()

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsKeywordExports,
		jsObjectExports,
		validationExports,
		TsGenericsExports {
	parse: RootModule<parsingExports>
}
