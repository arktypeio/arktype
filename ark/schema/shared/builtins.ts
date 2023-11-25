import { rootSchema } from "../scope.js"

export const createBuiltins = () =>
	({
		unknown: rootSchema({}),
		bigint: rootSchema("bigint"),
		number: rootSchema("number"),
		object: rootSchema("object"),
		string: rootSchema("string"),
		symbol: rootSchema("symbol"),
		array: rootSchema(Array),
		date: rootSchema(Date),
		false: rootSchema({ is: false }),
		null: rootSchema({ is: null }),
		undefined: rootSchema({ is: undefined }),
		true: rootSchema({ is: true }),
		never: rootSchema(),
		// this is parsed as prereduced so we can compare future
		// unions to it to determine if they should be reduced to unknown
		unknownUnion: rootSchema.prereduced("union", [
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
	}) as const

export type Builtins = ReturnType<typeof createBuiltins>
