import type { array, Digit, Key } from "@ark/util"
import type { Module } from "../module.js"
import { scope } from "../scope.js"
// these are needed to create some internal types
import { intrinsic } from "@ark/schema"
import "./tsKeywords.js"

export type NonNegativeIntegerString =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${bigint}`)

export interface internalExports {
	lengthBoundable: string | array
	key: Key
	nonNegativeIntegerString: NonNegativeIntegerString
}

export type internalModule = Module<internalExports>

export const internalModule: internalModule = scope(
	{
		lengthBoundable: intrinsic.lengthBoundable,
		key: intrinsic.key,
		nonNegativeIntegerString: intrinsic.nonNegativeIntegerString
	},
	{
		prereducedAliases: true
	}
).export()
