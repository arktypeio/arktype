import { arkKind, hasArkKind } from "@ark/schema"
import { builtinConstructors, hasDomain } from "@ark/util"

type ObjectArg = "object" | "callback" | "RegExp"

export interface PureBuiltin {
	name: string
	// each argument's kind, the last covering the rest
	objects?: readonly (ObjectArg | undefined)[]
	// the receiver's elements may be objects, as the method doesn't convert them
	objectElements?: true
	check?: (args: unknown[], self: unknown) => string | undefined
	// writes its first argument
	writes?: true
}

// web platform classes Node has, so `type.instanceOf(CryptoKey)` precompiles
// to a check of the global by name; one this Node lacks stays unread
const webClassNames = [
	"AbortController",
	"AbortSignal",
	"BroadcastChannel",
	"CompressionStream",
	"Crypto",
	"CryptoKey",
	"CustomEvent",
	"DecompressionStream",
	"DOMException",
	"Event",
	"EventTarget",
	"MessageChannel",
	"MessagePort",
	"ReadableStream",
	"SubtleCrypto",
	"TextDecoder",
	"TextEncoder",
	"TransformStream",
	"URLSearchParams",
	"WebSocket",
	"WritableStream"
] as const

const webClassesOf = (): Record<string, unknown> => {
	const result: Record<string, unknown> = {}
	for (const name of webClassNames) {
		const value = Reflect.get(globalThis, name)
		if (typeof value === "function") result[name] = value
	}
	return result
}

export const globalsByName: Record<string, unknown> = Object.assign(
	Object.create(null),
	{
		undefined,
		NaN,
		Infinity,
		Object,
		Math,
		JSON,
		Symbol,
		BigInt,
		parseInt,
		parseFloat,
		isNaN,
		isFinite
	},
	builtinConstructors,
	webClassesOf()
)

export const conversionProblem =
	"converts an object to a primitive, which runs its methods"

const withPrimitiveKeys = (args: unknown[]) =>
	(
		Array.isArray(args[0]) &&
		args[0].some(
			entry => isPlainContainer(entry) && hasDomain(entry[0], "object")
		)
	) ?
		conversionProblem
	:	undefined

const withoutProtoKeys = (args: unknown[]) =>
	args.some(arg => Object.getOwnPropertyDescriptor(Object(arg), "__proto__")) ?
		"copies a `__proto__` key, which changes the target's prototype"
	:	undefined

// arktype values serialize through `toJSON`, which prints registry names
const plainDataOnly = (args: unknown[]): string | undefined => {
	for (const arg of args) {
		if (typeof arg === "function")
			return "stringifies a function or arktype value"
		if (typeof arg !== "object" || arg === null || arg instanceof Date) continue
		const prototype = Object.getPrototypeOf(arg)
		if (
			!Array.isArray(arg) &&
			prototype !== Object.prototype &&
			prototype !== null
		)
			return "stringifies an object other than an array, plain object or Date"
		const problem = plainDataOnly(Object.values(arg))
		if (problem) return problem
	}
}

// an arktype value's own properties hold registry names and node ids
const withoutArkInternals = (args: unknown[]) =>
	(
		args.some(
			arg =>
				hasDomain(arg, "object") &&
				!isPlainContainer(arg) &&
				!hasArkKind(arg, "module")
		)
	) ?
		"reflects on a value other than an object literal or Module"
	:	undefined

// case mapping and whitespace vary by engine outside ASCII
const asciiOnly = (_: unknown[], self: unknown) =>
	/[\u0080-\uffff]/.test(self as string) ?
		"maps characters by the engine's Unicode version, which varies outside ASCII"
	:	undefined

export const pureBuiltins = new Map<Function, PureBuiltin>()

const definePure = (
	owner: object,
	ownerName: string,
	names: readonly string[],
	opts?: Omit<PureBuiltin, "name">
) => {
	for (const name of names) {
		pureBuiltins.set(Reflect.get(owner, name), {
			name: ownerName ? `${ownerName}.${name}` : name,
			...opts
		})
	}
}

definePure(globalThis, "", [
	"String",
	"Number",
	"Boolean",
	"BigInt",
	"Symbol",
	"parseInt",
	"parseFloat",
	"isNaN",
	"isFinite"
])
definePure(Object, "Object", ["values", "entries", "keys"], {
	objects: ["object"],
	check: withoutArkInternals
})
definePure(Object, "Object", ["fromEntries"], {
	objects: ["object"],
	check: withPrimitiveKeys
})
definePure(Object, "Object", ["freeze"], { objects: ["object"], writes: true })
// the interpreter evaluates esbuild's keepNames calls itself
definePure(Object, "Object", ["defineProperty"], {
	check: () =>
		"defines a property other than the name of a function its module created"
})
definePure(Object, "Object", ["assign"], {
	objects: ["object"],
	check: args => withoutArkInternals(args) ?? withoutProtoKeys(args),
	writes: true
})
definePure(Array, "Array", ["isArray"], { objects: ["object"] })
definePure(
	Number,
	"Number",
	["isInteger", "isSafeInteger", "isFinite", "isNaN"],
	{ objects: ["object"] }
)
definePure(JSON, "JSON", ["parse"], { objects: [undefined, "callback"] })
definePure(JSON, "JSON", ["stringify"], {
	objects: ["object", "callback", undefined],
	check: args => plainDataOnly(args.slice(0, 1))
})
definePure(Symbol, "Symbol", ["for"])
definePure(Math, "Math", ["abs", "ceil", "floor", "round", "max", "min"])

export const pureConstructors = new Map<Function, PureBuiltin>([
	[RegExp, { name: "RegExp", objects: ["RegExp", undefined] }],
	[
		Date,
		{
			name: "Date",
			check: args =>
				args.length === 1 && typeof args[0] === "number" ?
					undefined
				:	"reads the clock, the time zone or a format each engine parses its own way"
		}
	]
])

export type MethodReceiverKind = "string" | "number" | "array" | "date"

export const methodsByReceiverKind: Record<
	MethodReceiverKind,
	Record<string, Function>
> = {
	string: Object.create(null),
	number: Object.create(null),
	array: Object.create(null),
	date: Object.create(null)
}

const defineMethods = (
	kind: MethodReceiverKind,
	owner: Function,
	names: readonly string[],
	opts?: Omit<PureBuiltin, "name">
) => {
	for (const name of names) {
		const method = Reflect.get(owner.prototype, name)
		methodsByReceiverKind[kind][name] = method
		pureBuiltins.set(method, {
			name: `${owner.name}.prototype.${name}`,
			...opts
		})
	}
}

defineMethods("string", String, [
	"at",
	"charAt",
	"charCodeAt",
	"codePointAt",
	"concat",
	"endsWith",
	"includes",
	"indexOf",
	"lastIndexOf",
	"padEnd",
	"padStart",
	"repeat",
	"slice",
	"startsWith",
	"substring",
	"toString",
	"valueOf"
])
defineMethods("string", String, ["replace", "replaceAll"], {
	objects: ["RegExp", "callback"]
})
defineMethods("string", String, ["split"], { objects: ["RegExp", undefined] })
defineMethods(
	"string",
	String,
	["toLowerCase", "toUpperCase", "trim", "trimEnd", "trimStart"],
	{ check: asciiOnly }
)
defineMethods("number", Number, ["toString", "valueOf"], {
	check: args =>
		args[0] === undefined || args[0] === 10 ?
			undefined
		:	"prints a number in another radix"
})
defineMethods("array", Array, ["at", "flat", "slice"], {
	objectElements: true
})
defineMethods("array", Array, ["concat"], {
	objects: ["object"],
	objectElements: true
})
defineMethods("array", Array, ["join"])
defineMethods(
	"array",
	Array,
	["every", "filter", "find", "findIndex", "flatMap", "map", "reduce", "some"],
	{ objects: ["callback", "object"], objectElements: true }
)
defineMethods("array", Array, ["includes", "indexOf", "lastIndexOf"], {
	objects: ["object", undefined],
	objectElements: true
})
defineMethods("date", Date, ["getTime", "toISOString", "toJSON", "valueOf"])

export const isArkValue = (value: unknown): boolean =>
	hasDomain(value, "object") &&
	(value as { [arkKind]?: unknown })[arkKind] !== undefined

export type PlainContainer = Record<PropertyKey, unknown> | unknown[]

export const isPlainContainer = (value: unknown): value is PlainContainer => {
	if (Array.isArray(value)) return true
	if (typeof value !== "object" || value === null || intrinsics.has(value))
		return false
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

export const intrinsics = new Set<unknown>([globalThis])

const addIntrinsics = (value: unknown) => {
	if (
		(typeof value !== "object" && typeof value !== "function") ||
		value === null ||
		intrinsics.has(value)
	)
		return
	intrinsics.add(value)
	for (const key of Reflect.ownKeys(value)) {
		const descriptor = Reflect.getOwnPropertyDescriptor(value, key)!
		addIntrinsics(descriptor.value)
		addIntrinsics(descriptor.get)
		addIntrinsics(descriptor.set)
	}
	addIntrinsics(Object.getPrototypeOf(value))
}

for (const value of [
	...Object.values(globalsByName),
	Reflect,
	Proxy,
	eval,
	Function
])
	addIntrinsics(value)
