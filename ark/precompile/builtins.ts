import { arkKind, hasArkKind } from "@ark/schema"
import { builtinConstructors, hasDomain } from "@ark/util"

export interface PureBuiltin {
	name: string
	// returns a problem with the arguments, e.g. that they are not all primitives
	check?: (args: unknown[], self: unknown) => string | undefined
	// the spec leaves the result implementation-approximated unless every operand is an integer
	isApproximate?: true
	// reads only own properties of object arguments, so it runs none of their code
	readsOnly?: true
	// writes its first argument
	writes?: true
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
		isFinite,
		encodeURIComponent,
		decodeURIComponent,
		encodeURI,
		decodeURI
	},
	builtinConstructors
)

const primitivesOnly = (args: unknown[]) =>
	(
		args.some(arg =>
			typeof arg === "object" ? arg !== null : typeof arg === "function"
		)
	) ?
		"converts an object to a primitive, which runs its methods"
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

// an arktype value's own properties are its implementation, which holds registry names and node ids
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

// arktype leaves identity between equal definitions unspecified
const withoutArkIdentity = (args: unknown[]) =>
	args.some(isArkValue) ?
		"compares an arktype value by identity, which is unspecified"
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

definePure(
	globalThis,
	"",
	["String", "Number", "Boolean", "BigInt", "Symbol"],
	{
		check: primitivesOnly
	}
)
definePure(
	globalThis,
	"",
	[
		"parseInt",
		"parseFloat",
		"isNaN",
		"isFinite",
		"encodeURIComponent",
		"decodeURIComponent",
		"encodeURI",
		"decodeURI"
	],
	{ check: primitivesOnly }
)
definePure(
	Object,
	"Object",
	["keys", "values", "entries", "isFrozen", "getOwnPropertyNames"],
	{ check: withoutArkInternals, readsOnly: true }
)
definePure(Object, "Object", ["hasOwn"], { check: withoutArkInternals })
definePure(Object, "Object", ["fromEntries"])
definePure(Object, "Object", ["freeze"], { readsOnly: true, writes: true })
definePure(Object, "Object", ["assign"], {
	check: args => withoutArkInternals(args) ?? withoutProtoKeys(args),
	readsOnly: true,
	writes: true
})
definePure(Array, "Array", ["isArray", "of"], { readsOnly: true })
definePure(Array, "Array", ["from"])
definePure(
	Number,
	"Number",
	["isInteger", "isSafeInteger", "isFinite", "isNaN"],
	{
		readsOnly: true
	}
)
definePure(Number, "Number", ["parseFloat", "parseInt"])
definePure(String, "String", ["fromCharCode", "fromCodePoint", "raw"])
definePure(JSON, "JSON", ["parse"])
definePure(JSON, "JSON", ["stringify"], {
	check: args => plainDataOnly(args.slice(0, 1))
})
definePure(Date, "Date", ["UTC"])
definePure(Symbol, "Symbol", ["for"])
definePure(Math, "Math", [
	"abs",
	"ceil",
	"floor",
	"round",
	"trunc",
	"sign",
	"max",
	"min",
	"fround",
	"clz32",
	"imul",
	"sqrt"
])
definePure(
	Math,
	"Math",
	[
		"acos",
		"acosh",
		"asin",
		"asinh",
		"atan",
		"atanh",
		"atan2",
		"cbrt",
		"cos",
		"cosh",
		"exp",
		"expm1",
		"hypot",
		"log",
		"log1p",
		"log10",
		"log2",
		"pow",
		"sin",
		"sinh",
		"tan",
		"tanh"
	],
	{ isApproximate: true }
)

export type MethodReceiverKind =
	| "string"
	| "number"
	| "boolean"
	| "bigint"
	| "array"
	| "date"

export const methodsByReceiverKind: Record<
	MethodReceiverKind,
	Record<string, Function>
> = {
	string: Object.create(null),
	number: Object.create(null),
	boolean: Object.create(null),
	bigint: Object.create(null),
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
	"normalize",
	"padEnd",
	"padStart",
	"repeat",
	"replace",
	"replaceAll",
	"slice",
	"split",
	"startsWith",
	"substring",
	"toLowerCase",
	"toUpperCase",
	"toString",
	"trim",
	"trimEnd",
	"trimStart",
	"valueOf"
])
defineMethods("number", Number, [
	"toExponential",
	"toFixed",
	"toPrecision",
	"toString",
	"valueOf"
])
defineMethods("boolean", Boolean, ["toString", "valueOf"])
defineMethods("bigint", BigInt, ["toString", "valueOf"])
defineMethods("array", Array, [
	"at",
	"concat",
	"every",
	"filter",
	"find",
	"findIndex",
	"findLast",
	"findLastIndex",
	"flat",
	"flatMap",
	"join",
	"map",
	"reduce",
	"reduceRight",
	"slice",
	"some",
	"toReversed",
	"toSorted",
	"toSpliced",
	"with"
])
defineMethods("array", Array, ["includes", "indexOf", "lastIndexOf"], {
	check: withoutArkIdentity
})
defineMethods("date", Date, [
	"getTime",
	"toISOString",
	"toJSON",
	"valueOf",
	"getUTCDate",
	"getUTCDay",
	"getUTCFullYear",
	"getUTCHours",
	"getUTCMilliseconds",
	"getUTCMinutes",
	"getUTCMonth",
	"getUTCSeconds"
])

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
