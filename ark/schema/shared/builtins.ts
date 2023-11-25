import { parseBranches, parsePrereducedSchema } from "../parse.js"

export function createBuiltins() {
	return {
		unknown: parseBranches({}),
		bigint: parseBranches("bigint"),
		number: parseBranches("number"),
		object: parseBranches("object"),
		string: parseBranches("string"),
		symbol: parseBranches("symbol"),
		array: parseBranches(Array),
		date: parseBranches(Date),
		false: parseBranches({ is: false }),
		null: parseBranches({ is: null }),
		undefined: parseBranches({ is: undefined }),
		true: parseBranches({ is: true }),
		never: parseBranches(),
		// this is parsed as prereduced so we can compare future
		// unions to it to determine if they should be reduced to unknown
		unknownUnion: parsePrereducedSchema("union", [
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

export type Builtins = ReturnType<typeof createBuiltins>
