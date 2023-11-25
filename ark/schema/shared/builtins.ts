import { node, parsePrereduced } from "../parse.js"

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
		// this is parsed as prereduced so we can compare future
		// unions to it to determine if they should be reduced to unknown
		unknownUnion: parsePrereduced("union", [
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ is: true },
			{ is: false },
			{ is: null },
			{ is: undefined }
		])
	} as const
}
