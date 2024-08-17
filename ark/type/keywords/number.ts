import { intrinsic, rootNode } from "@ark/schema"
import type { AtLeast, AtMost, DivisibleBy, inferred, number } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"

/**
 * As per the ECMA-262 specification:
 * A time value supports a slightly smaller range of -8,640,000,000,000,000 to 8,640,000,000,000,000 milliseconds.
 *
 * @see https://262.ecma-international.org/15.0/index.html#sec-time-values-and-time-range
 */
export const unixTimestampNumber = rootNode({
	domain: {
		domain: "number",
		meta: "a number representing a Unix timestamp"
	},
	divisor: {
		rule: 1,
		meta: `an integer representing a Unix timestamp`
	},
	min: {
		rule: -8640000000000000,
		meta: `a Unix timestamp after -8640000000000000`
	},
	max: {
		rule: 8640000000000000,
		meta: "a Unix timestamp before 8640000000000000"
	},
	meta: "an integer representing a safe Unix timestamp"
})

const keywords: Module<arkNumber.keywords> = scope(
	{
		integer: rootNode({
			domain: "number",
			divisor: 1
		})
	},
	{ prereducedAliases: true }
).export()

const submodule: Module<arkNumber.submodule> = scope(
	{
		...keywords,
		$root: intrinsic.number,
		unix: unixTimestampNumber
	},
	{
		prereducedAliases: true
	}
).export()

export const arkNumber = {
	keywords,
	submodule
}

export declare namespace arkNumber {
	export interface keywords {
		integer: number.divisibleBy<1>
	}

	export interface submodule extends keywords {
		$root: number
		[inferred]: number
		unix: number.is<
			DivisibleBy<1> & AtMost<8640000000000000> & AtLeast<-8640000000000000>
		>
	}
}
