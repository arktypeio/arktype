import { node } from "../node.ts"

export function createBuiltins() {
	return {
		unknown: node({}),
		bigint: node("bigint"),
		number: node("number"),
		object: node("object"),
		string: node("string"),
		symbol: node("symbol"),
		array: node(Array),
		date: node(Date),
		false: node({ is: false }),
		null: node({ is: null }),
		undefined: node({ is: undefined }),
		true: node({ is: true }),
		never: node()
	} as const
}

export type Builtins = ReturnType<typeof createBuiltins>
