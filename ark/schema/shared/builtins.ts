import { BaseNode, node } from "../node.ts"

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
		never: node(),
		unknownUnion: BaseNode.parseSchema(
			"union",
			[
				"string",
				"number",
				"object",
				"bigint",
				"symbol",
				{ is: true },
				{ is: false },
				{ is: null },
				{ is: undefined }
			],
			{ ctor: BaseNode, basis: undefined, prereduced: true }
		)
	} as const
}

export type Builtins = ReturnType<typeof createBuiltins>
