import { intrinsic, rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import { arkModule } from "../utils.ts"
import { epoch } from "./epoch.ts"
import { integer } from "./integer.ts"

export const number: number.module = arkModule({
	root: intrinsic.number,
	integer,
	epoch,
	safe: rootSchema({
		domain: "number",
		min: Number.MIN_SAFE_INTEGER,
		max: Number.MAX_SAFE_INTEGER,
		predicate: {
			predicate: n => !Number.isNaN(n),
			meta: "a safe number"
		}
	}),
	NaN: ["===", Number.NaN],
	Infinity: ["===", Number.POSITIVE_INFINITY],
	NegativeInfinity: ["===", Number.NEGATIVE_INFINITY]
})

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
