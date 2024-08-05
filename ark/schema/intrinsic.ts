import { node, schemaScope } from "./scope.js"
import { arrayIndexSource } from "./structure/shared.js"

const intrinsicBases = schemaScope(
	{
		bigint: "bigint",
		// since we know this won't be reduced, it can be safely cast to a union
		boolean: [{ unit: false }, { unit: true }],
		false: { unit: false },
		never: [],
		null: { unit: null },
		number: "number",
		object: "object",
		string: "string",
		symbol: "symbol",
		true: { unit: true },
		unknown: {},
		undefined: { unit: undefined },
		Array,
		Date
	},
	{ prereducedAliases: true }
).export()

$ark.intrinsic = { ...intrinsicBases } as never

const intrinsicRoots = schemaScope(
	{
		integer: {
			domain: "number",
			divisor: 1
		},
		lengthBoundable: ["string", Array],
		key: ["string", "symbol"],
		nonNegativeIntegerString: { domain: "string", pattern: arrayIndexSource }
	},
	{ prereducedAliases: true }
).export()

// reduce union of all possible values reduces to unknown
node(
	"union",
	{
		branches: [
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ unit: true },
			{ unit: false },
			{ unit: null },
			{ unit: undefined }
		]
	},
	{ reduceTo: node("intersection", {}, { prereduced: true }) }
)

export const intrinsic = {
	...intrinsicBases,
	...intrinsicRoots,
	emptyStructure: node("structure", {}, { prereduced: true })
}

$ark.intrinsic = { ...intrinsic } as never
