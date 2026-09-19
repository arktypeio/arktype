import { lazily } from "@ark/util"
import { bootstrapRootScope, node, schemaScope } from "./scope.ts"
import { $ark } from "./shared/registry.ts"
import { arrayIndexSource } from "./structure/shared.ts"

const bootstrapIntrinsic = () => {
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

	// needed to parse index signatures for JSON
	Object.assign($ark.intrinsic, intrinsicRoots)

	const intrinsicJson = schemaScope(
		{
			jsonPrimitive: [
				"string",
				"number",
				{ unit: true },
				{ unit: false },
				{ unit: null }
			],
			jsonObject: {
				domain: "object",
				index: {
					signature: "string",
					value: "$jsonData"
				}
			},
			jsonData: ["$jsonPrimitive", "$jsonObject"]
		},
		{ prereducedAliases: true }
	).export()

	const intrinsic = {
		...intrinsicBases,
		...intrinsicRoots,
		...intrinsicJson,
		emptyStructure: node("structure", {}, { prereduced: true })
	}

	$ark.intrinsic = { ...intrinsic } as never

	return intrinsic
}

let bootstrapped = false

/**
 * Parse the nodes every scope shares, precompile the root scope and parse
 * the intrinsics.
 *
 * Deferred to first use- constructing a scope, parsing in the root scope or
 * reading an intrinsic- rather than run on import, so that a set engine
 * installed by a package that itself imports @ark/schema (i.e. arksets) is in
 * place before any node is reduced or discriminated.
 */
export const bootstrap = (): void => {
	if (bootstrapped) return
	bootstrapped = true
	bootstrapRootScope()
	bootstrapIntrinsic()
}

export const intrinsic: ReturnType<typeof bootstrapIntrinsic> = lazily(() => {
	bootstrap()
	return $ark.intrinsic
})
