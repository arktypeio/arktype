import type { RootSchema } from "../kinds.js"
import type { SchemaModule } from "../module.js"
import { schemaScope } from "../scope.js"

export interface tsKeywordExports {
	any: any
	bigint: bigint
	boolean: boolean
	false: false
	never: never
	null: null
	number: number
	object: object
	string: string
	symbol: symbol
	true: true
	unknown: unknown
	undefined: undefined
}

export type tsKeywords = SchemaModule<tsKeywordExports>

export const tsKeywords: tsKeywords = schemaScope(
	{
		any: {},
		bigint: "bigint",
		// since we know this won't be reduced, it can be safely cast to a union
		boolean: [{ unit: false }, { unit: true }],
		false: { unit: false },
		never: [],
		null: { unit: null },
		number: "number",
		object: "object",
		string: "string",
		symbol: "symbol",
		true: { unit: true },
		unknown: {},
		undefined: { unit: undefined }
		// void is not included because it doesn't have a well-defined meaning
		// as a standalone type
	} satisfies Record<keyof tsKeywordExports, RootSchema>,
	{ prereducedAliases: true, intrinsic: true }
).export()
