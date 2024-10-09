import { rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Nominal, of, To } from "../inference.ts"
import { arkModule } from "../utils.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type trimmed = of<string, Nominal<"trimmed">>
}

const preformatted = regexStringNode(
	// no leading or trailing whitespace
	/^\S.*\S$|^\S?$/,
	"trimmed"
)

export const trim: trim.module = arkModule({
	root: rootSchema({
		in: "string",
		morphs: (s: string) => s.trim(),
		declaredOut: preformatted
	}),
	preformatted
})

export declare namespace trim {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string.trimmed>
		preformatted: string.trimmed
	}
}
