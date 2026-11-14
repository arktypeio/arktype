import { intrinsic, node } from "@ark/schema"
import { cached } from "@ark/util"
import type { Module, Submodule } from "../module.ts"
import { keywordModule } from "../scope.ts"
import { epochDescriptions, maxEpoch } from "./functions.ts"
import { keywordMeta } from "./phrases.ts"

export const epoch = cached(() =>
	node("intersection", {
		domain: node("domain", {
			domain: "number",
			meta: {
				description: epochDescriptions.domain,
				keyword: "number.epoch"
			}
		}),
		divisor: node("divisor", {
			rule: 1,
			meta: {
				description: `an integer representing a Unix timestamp`,
				keyword: "number.epoch"
			}
		}),
		min: node("min", {
			rule: -maxEpoch,
			meta: { description: epochDescriptions.min, keyword: "number.epoch" }
		}),
		max: node("max", {
			rule: maxEpoch,
			meta: { description: epochDescriptions.max, keyword: "number.epoch" }
		}),
		meta: keywordMeta("number.epoch")
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
