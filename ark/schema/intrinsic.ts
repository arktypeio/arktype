import { bootstrapRootScope, node, schemaScope } from "./scope.ts"
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
let bootstrappedWithEngine = false

const bootstrapOnRead = () =>
	Object.defineProperty($ark, "intrinsic", {
		get: () => {
			bootstrap()
			return $ark.intrinsic
		},
		enumerable: true,
		configurable: true
	})

bootstrapOnRead()

// deferred to first use so arksets, which imports @ark/schema, can install its engine first
export const bootstrap = (): void => {
	if (bootstrapped && (bootstrappedWithEngine || !$ark.sets)) return
	bootstrapped = true
	bootstrappedWithEngine = $ark.sets !== undefined
	Object.defineProperty($ark, "intrinsic", {
		value: undefined,
		writable: true,
		enumerable: true,
		configurable: true
	})
	try {
		bootstrapRootScope(() =>
			Object.assign(intrinsicTarget, bootstrapIntrinsic())
		)
	} catch (e) {
		bootstrapped = false
		bootstrapOnRead()
		throw e
	}
}

const intrinsicTarget: typeof $ark.intrinsic = {} as never

const currentIntrinsic = (): typeof $ark.intrinsic => {
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
