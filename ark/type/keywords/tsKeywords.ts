import { intrinsic, type BaseRoot } from "@ark/schema"
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
		any: intrinsic.unknown,
		bigint: intrinsic.bigint,
		boolean: intrinsic.boolean,
		false: intrinsic.false,
		never: intrinsic.never,
		null: intrinsic.null,
		number: intrinsic.number,
		object: intrinsic.object,
		string: intrinsic.string,
		symbol: intrinsic.symbol,
		true: intrinsic.true,
		unknown: intrinsic.unknown,
		undefined: intrinsic.undefined
	} satisfies Record<keyof tsKeywordExports, BaseRoot>,
	{ prereducedAliases: true }
).export()
