import { intrinsic, rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Branded, To, constrain } from "../ast.ts"
import { arkModule } from "../utils.ts"

declare namespace string {
	export type json = constrain<string, Branded<"json">>
}

const jsonStringDescription = "a JSON string"

const isParsableJson = (s: string) => {
	try {
		JSON.parse(s)
		return true
	} catch {
		return false
	}
}

const root = rootSchema({
	domain: "string",
	predicate: {
		meta: jsonStringDescription,
		predicate: isParsableJson
	}
})

export const json: stringJson.module = arkModule({
	root,
	parse: rootSchema({
		in: "string",
		morphs: (s: string, ctx) => {
			if (s.length === 0) {
				return ctx.error({
					code: "predicate",
					expected: jsonStringDescription,
					actual: "empty"
				})
			}
			try {
				return JSON.parse(s)
			} catch (e) {
				return ctx.error({
					code: "predicate",
					expected: jsonStringDescription,
					problem: `must be ${jsonStringDescription} (${e})`
				})
			}
		},
		declaredOut: intrinsic.json
	})
})

export declare namespace stringJson {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string.json
		parse: (In: string.json) => To<object>
	}
}
