import {
	cached,
	defineLazily,
	defineValue,
	isPlainObjectOrArray
} from "@ark/util"
import {
	bootstrapRootScope,
	node,
	SchemaScope,
	type SchemaScopeParser
} from "./scope.ts"
import type { BaseRoot } from "./roots/root.ts"
import { $ark } from "./shared/registry.ts"
import { arrayIndexSource } from "./structure/shared.ts"

const builtinScope: SchemaScopeParser = (aliases, config) =>
	new SchemaScope(aliases, config, true)

const jsonIntrinsicNames = ["jsonPrimitive", "jsonObject", "jsonData"] as const

type IntrinsicJson = Record<(typeof jsonIntrinsicNames)[number], BaseRoot>

const bootstrapIntrinsic = () => {
	const intrinsicBases = builtinScope(
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
		{ prereducedAliases: true, name: "intrinsic" }
	).export()

	$ark.kw = { ...intrinsicBases } as never

	const intrinsicRoots = builtinScope(
		{
			integer: {
				domain: "number",
				divisor: 1
			},
			lengthBoundable: ["string", Array],
			key: ["string", "symbol"],
			nonNegativeIntegerString: { domain: "string", pattern: arrayIndexSource }
		},
		{ prereducedAliases: true, name: "intrinsic.roots" }
	).export()

	// needed to parse index signatures for JSON
	Object.assign($ark.kw, intrinsicRoots)

	const intrinsic = { ...intrinsicBases, ...intrinsicRoots }

	// only JSON keywords read these, so most programs never parse them
	const exportJson = cached(() =>
		builtinScope(
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
					// the only objects JSON.parse returns
					predicate: [
						{
							predicate: isPlainObjectOrArray,
							meta: {
								description: "a plain object or array",
								keyword: "object.json"
							}
						}
					],
					index: {
						signature: "string",
						value: "$jsonData"
					}
				},
				jsonData: ["$jsonPrimitive", "$jsonObject"]
			},
			{ prereducedAliases: true, name: "intrinsic.json" }
		).export()
	)
	for (const k of jsonIntrinsicNames)
		defineLazily(intrinsic, k, () => exportJson()[k])

	// assigned after JSON's keys, so it still enumerates last
	const result = Object.assign(intrinsic as typeof intrinsic & IntrinsicJson, {
		emptyStructure: node("structure", {}, { prereduced: true })
	})

	$ark.kw = result as never

	return result
}

let bootstrapped = false
let bootstrappedWithEngine = false
const intrinsicTarget: typeof $ark.kw = {} as never

const bootstrapOnRead = () =>
	Object.defineProperty($ark, "kw", {
		get: () => {
			bootstrap()
			return $ark.kw
		},
		enumerable: true,
		configurable: true
	})

bootstrapOnRead()

// deferred so arksets, which imports @ark/schema, can install its engine first
export const bootstrap = (): void => {
	if (bootstrapped && (bootstrappedWithEngine || !$ark.sets)) return
	bootstrapped = true
	bootstrappedWithEngine = $ark.sets !== undefined
	defineValue($ark, "kw", undefined)
	try {
		bootstrapRootScope()
		Object.defineProperties(
			intrinsicTarget,
			Object.getOwnPropertyDescriptors(bootstrapIntrinsic())
		)
	} catch (e) {
		bootstrapped = false
		bootstrapOnRead()
		throw e
	}
}

const currentIntrinsic = (): typeof $ark.kw => {
	bootstrap()
	return intrinsicTarget
}

export const intrinsic: ReturnType<typeof bootstrapIntrinsic> = new Proxy(
	intrinsicTarget,
	{
		get: (_, k) => Reflect.get(currentIntrinsic(), k),
		has: (_, k) => Reflect.has(currentIntrinsic(), k),
		ownKeys: () => Reflect.ownKeys(currentIntrinsic()),
		getOwnPropertyDescriptor: (_, k) =>
			Reflect.getOwnPropertyDescriptor(currentIntrinsic(), k)
	}
)
