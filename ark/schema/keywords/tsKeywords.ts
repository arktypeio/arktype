import type { type } from "../inference.js"
import type { RootModule } from "../module.js"
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
	void: void
	undefined: undefined
}

export type tsKeywords = RootModule<tsKeywordExports>

export const tsKeywords: tsKeywords = schemaScope(
	{
		any: {} as type.cast<any>,
		bigint: "bigint",
		// since we know this won't be reduced, it can be safely cast to a union
		boolean: [{ unit: false }, { unit: true }] as type.cast<boolean>,
		false: { unit: false },
		never: [],
		null: { unit: null },
		number: "number",
		object: "object",
		string: "string",
		symbol: "symbol",
		true: { unit: true },
		unknown: {},
		void: { unit: undefined } as type.cast<void>,
		undefined: { unit: undefined }
	},
	{ prereducedAliases: true, registerKeywords: true }
).export()
