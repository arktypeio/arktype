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
		false: rootSchema({ unit: false }),
		null: rootSchema({ unit: null }),
		undefined: rootSchema({ unit: undefined }),
		true: rootSchema({ unit: true }),
		never: rootSchema(),
		// this is parsed as prereduced so we can compare future
		// unions to it to determine if they should be reduced to unknown
		unknownUnion: rootSchema.prereduced("union", [
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ unit: true },
			{ unit: false },
			{ unit: null },
			{ unit: undefined }
		])
	}) as const

export type Builtins = ReturnType<typeof createBuiltins>
