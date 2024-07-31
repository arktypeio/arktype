import type { array, Digit, Key } from "@ark/util"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
// these are needed to create some internal types
import { intrinsic, node } from "@ark/schema"
import "./tsKeywords.js"

export type NonNegativeIntegerString =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${bigint}`)

export interface internalExports {
	lengthBoundable: string | array
	propertyKey: Key
	nonNegativeIntegerString: NonNegativeIntegerString
}

export type internal = Module<internalExports>

export const internal: internal = scope(
	{
		lengthBoundable: intrinsic.lengthBoundable,
		propertyKey: intrinsic.propertyKey,
		nonNegativeIntegerString: intrinsic.nonNegativeIntegerString
	},
	{
		prereducedAliases: true,
		ambient: true
	}
).export()

// reduce union of all possible values reduces to unknown
node(
	"union",
	{
		branches: [
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ unit: true },
			{ unit: false },
			{ unit: null },
			{ unit: undefined }
		]
	},
	{ reduceTo: node("intersection", {}, { prereduced: true }) }
)
