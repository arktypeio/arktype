import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, Out } from "../ast.ts"
import { submodule } from "../utils.ts"

namespace string {
	export type json = constrain<string, Branded<"json">>
}

const isParsableJson = (s: string) => {
	try {
		JSON.parse(s)
		return true
	} catch {
		return false
	}
}

const $root = rootNode({
	domain: "string",
	predicate: {
		meta: "a JSON string",
		predicate: isParsableJson
	}
})

export const json = submodule({
	$root,
	parse: rootNode({
		in: $root as never,
		// TODO: ideally we'd want to just reuse the JSON.parse result from
		// validation here. Need some way to "cast" a type-level input/output
		morphs: (s: string) => JSON.parse(s)
	})
})

export type json = Submodule<{
	$root: string.json
	parse: (In: string.json) => Out<object>
}>
