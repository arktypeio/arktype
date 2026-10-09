import { intrinsic, node } from "@ark/schema"
import { cached } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"

/**
 * As per the ECMA-262 specification:
 * A time value supports a slightly smaller range of -8,640,000,000,000,000 to 8,640,000,000,000,000 milliseconds.
 *
 * @see https://262.ecma-international.org/15.0/index.html#sec-time-values-and-time-range
 */

export const epoch = cached(() =>
	node("intersection", {
		domain: node("domain", {
			domain: "number",
			meta: "a number representing a Unix timestamp"
		}),
		divisor: node("divisor", {
			rule: 1,
			meta: `an integer representing a Unix timestamp`
		}),
		min: node("min", {
			rule: -8640000000000000,
			meta: `a Unix timestamp after -8640000000000000`
		}),
		max: node("max", {
			rule: 8640000000000000,
			meta: "a Unix timestamp before 8640000000000000"
		}),
		meta: "an integer representing a safe Unix timestamp"
	})
)

export const integer = cached(() =>
	node("intersection", {
		domain: node("domain", { domain: "number" }),
		divisor: node("divisor", { rule: 1 })
	})
)

export const number: number.module = keywordModule(
	{
		root: () => intrinsic.number,
		integer,
		epoch,
		safe: () =>
			node("intersection", {
				domain: node("domain", {
					domain: "number",
					numberAllowsNaN: false
				}),
				min: node("min", { rule: Number.MIN_SAFE_INTEGER }),
				max: node("max", { rule: Number.MAX_SAFE_INTEGER })
			}),
		NaN: ["===", Number.NaN],
		Infinity: ["===", Number.POSITIVE_INFINITY],
		NegativeInfinity: ["===", Number.NEGATIVE_INFINITY]
	},
	{
		name: "number"
	}
) as never

export declare namespace number {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: number
		epoch: number
		integer: number
		safe: number
		NaN: number
		Infinity: number
		NegativeInfinity: number
	}
}
