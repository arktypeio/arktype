import type { Module } from "../module.js"
import { scope } from "../scope.js"

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

export type tsKeywords = Module<tsKeywordExports>

export const tsKeywords: tsKeywords = scope(
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
	},
	{ prereducedAliases: true }
).export()
