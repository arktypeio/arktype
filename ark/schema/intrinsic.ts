import { lazily } from "@ark/util"
import {
	bootstrapRootScope,
	node,
	schemaScope,
	withFixedGlobalConfig
} from "./scope.ts"
import { $ark } from "./shared/registry.ts"
import { arrayIndexSource } from "./structure/shared.ts"

const bootstrapIntrinsic = () => {
	const intrinsicBases = schemaScope({
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
	}).export()

	$ark.intrinsic = { ...intrinsicBases } as never

	const intrinsicRoots = schemaScope({
		integer: {
			domain: "number",
			divisor: 1
		},
		lengthBoundable: ["string", Array],
		key: ["string", "symbol"],
		nonNegativeIntegerString: { domain: "string", pattern: arrayIndexSource }
	}).export()

	// needed to parse index signatures for JSON
	Object.assign($ark.intrinsic, intrinsicRoots)

	const intrinsicJson = schemaScope({
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
	}).export()

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
let bootstrappedIntrinsic: typeof $ark.intrinsic | undefined

// reading $ark.intrinsic bootstraps, so the registry has the intrinsics
// before anything is parsed
Object.defineProperty($ark, "intrinsic", {
	get: () => {
		bootstrap()
		return bootstrappedIntrinsic
	},
	set: v => {
		bootstrappedIntrinsic = v
	},
	enumerable: true,
	configurable: true
})

/**
 * Parse the nodes every scope shares, precompile the root scope and parse
 * the intrinsics.
 *
 * Deferred to first use- parsing or reading an intrinsic- rather than run on
 * import, so that a set engine installed by a package that itself imports
 * @ark/schema (i.e. arksets) is in place before any node is reduced or
 * discriminated. Parsed with the global config fixed by fixGlobalConfig, if
 * one is.
 */
export const bootstrap = (): void => {
	if (bootstrapped) return
	// set before the work so that parsing during it doesn't recurse, and
	// unset if it fails so the next call reports the original error again
	bootstrapped = true
	try {
		withFixedGlobalConfig(() => {
			bootstrapRootScope()
			bootstrapIntrinsic()
		})
	} catch (e) {
		bootstrapped = false
		throw e
	}
	// nodes read it as they are constructed, so from here on it is a plain
	// property
	Object.defineProperty($ark, "intrinsic", {
		value: bootstrappedIntrinsic,
		writable: true,
		enumerable: true,
		configurable: true
	})
}

export const intrinsic: ReturnType<typeof bootstrapIntrinsic> = lazily(() => {
	bootstrap()
	return $ark.intrinsic
})
