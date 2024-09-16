import { intrinsic, rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Branded, To, constrain } from "../inference.ts"
import { arkModule } from "../utils.ts"

declare namespace string {
	export type json = constrain<string, Branded<"json">>
}

const jsonStringDescription = "a JSON string"

export const writeJsonSyntaxErrorProblem = (error: unknown): string => {
	if (!(error instanceof SyntaxError)) throw error
	return `must be ${jsonStringDescription} (${error})`
}

const root = rootSchema({
	domain: "string",
	predicate: {
		meta: jsonStringDescription,
		predicate: (s: string, ctx) => {
			try {
				JSON.parse(s)
				return true
			} catch (e) {
				return ctx.reject({
					code: "predicate",
					expected: jsonStringDescription,
					problem: writeJsonSyntaxErrorProblem(e)
				})
			}
		}
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
					problem: writeJsonSyntaxErrorProblem(e)
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
