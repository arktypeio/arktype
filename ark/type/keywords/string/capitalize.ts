import { rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../inference.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type capitalized = constrain<string, Branded<"capitalized">>
}

const preformatted = regexStringNode(/^[A-Z].*$/, "capitalized")

export const capitalize: capitalize.module = arkModule({
	root: rootSchema({
		in: "string",
		morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
		declaredOut: preformatted
	}),
	preformatted
})

export declare namespace capitalize {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string.capitalized>
		preformatted: string.capitalized
	}
}
