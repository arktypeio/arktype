import type { array, Digit, Key } from "@arktype/util"
import type { SchemaModule } from "../module.js"
import { root, schemaScope } from "../scope.js"
// these are needed to create some internal types
import { arrayIndexSource } from "../structure/shared.js"
import "./tsKeywords.js"

export type NonNegativeIntegerString =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${bigint}`)

export interface internalExports {
	lengthBoundable: string | array
	propertyKey: Key
	nonNegativeIntegerString: NonNegativeIntegerString
}

export type internal = SchemaModule<internalExports>

export const internal: internal = schemaScope(
	{
		lengthBoundable: ["string", Array],
		propertyKey: ["string", "symbol"],
		nonNegativeIntegerString: { domain: "string", pattern: arrayIndexSource }
	},
	{
		prereducedAliases: true,
		intrinsic: true
	}
).export()

// reduce union of all possible values reduces to unknown
root.node(
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
	{ reduceTo: root.node("intersection", {}, { prereduced: true }) }
)
