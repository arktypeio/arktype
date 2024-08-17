import { intrinsic } from "@ark/schema"
import type { Module } from "../module.js"
import { scope } from "../scope.js"

const keywords: Module<arkTs.keywords> = scope(
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
	},
	{ prereducedAliases: true }
).export()

export const arkTs = {
	keywords
}

export declare namespace arkTs {
	export interface keywords {
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
}
