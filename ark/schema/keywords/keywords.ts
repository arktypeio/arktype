import type { GenericSchema } from "../generic.js"
import type { SchemaModule } from "../module.js"
import type { jsObjects } from "./jsObjects.js"
import type { parsing } from "./parsing.js"
import type { tsKeywords } from "./tsKeywords.js"
import type { validation } from "./validation.js"

type TsGenericsExports<$ = Ark> = {
	Record: GenericSchema<
		["K", "V"],
		{
			"[K]": "V"
		},
		// as long as the generics in the root scope don't reference one
		// another, they shouldn't need a bound local scope
		$
	>
}

export const keywordNodes: SchemaModule<Ark> = {} as never

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	extends tsKeywords.exports,
		jsObjects.exports,
		validation.exports,
		TsGenericsExports {
	parse: SchemaModule<parsing.exports>
}
