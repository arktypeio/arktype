import { rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Nominal, of, To } from "../inference.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type uppercase = of<string, Nominal<"uppercase">>
}

const preformatted = regexStringNode(/^[A-Z]*$/, "only uppercase letters")

export const upper: upper.module = arkModule({
	root: rootSchema({
		in: "string",
		morphs: (s: string) => s.toUpperCase(),
		declaredOut: preformatted
	}),
	preformatted
})

export declare namespace upper {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string.uppercase>
		preformatted: string.uppercase
	}
}
