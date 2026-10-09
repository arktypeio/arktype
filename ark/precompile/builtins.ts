import { arkKind, hasArkKind } from "@ark/schema"
import { builtinConstructors, hasDomain } from "@ark/util"

export type ObjectArg = "object" | "callback" | "RegExp"

export interface PureBuiltin {
	name: string
	// each argument's ObjectArg, the last also covering those after it, since a builtin converts an object anywhere else, running its methods
	objects?: readonly (ObjectArg | undefined)[]
	// the receiver's elements may be objects, as the method doesn't convert them
	objectElements?: true
	// returns a problem with the arguments
	check?: (args: unknown[], self: unknown) => string | undefined
	// the spec leaves the result implementation-approximated unless every operand is an integer
	isApproximate?: true
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

export const conversionProblem =
	"converts an object to a primitive, which runs its methods"

// an array-like's length is converted to a number
const withPrimitiveLength = (args: unknown[]) =>
	(
		!Array.isArray(args[0]) &&
		isPlainContainer(args[0]) &&
		hasDomain(args[0].length, "object")
	) ?
		conversionProblem
	:	undefined

// each entry's key is converted to a property key
const withPrimitiveKeys = (args: unknown[]) =>
	(
		Array.isArray(args[0]) &&
		args[0].some(
			entry => isPlainContainer(entry) && hasDomain(entry[0], "object")
		)
	) ?
		conversionProblem
	:	undefined

// each string of a template is converted to a string
const withPrimitiveStrings = (args: unknown[]) => {
	const raw =
		isPlainContainer(args[0]) ? Reflect.get(args[0], "raw") : undefined
	return Array.isArray(raw) && raw.some(item => hasDomain(item, "object")) ?
			conversionProblem
		:	undefined
}

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

// case mapping, normalization and whitespace follow each engine's Unicode version outside ASCII
const asciiOnly = (_: unknown[], self: unknown) => {
	for (const c of self as string) {
		if (c.charCodeAt(0) > 127)
			return "maps characters by the engine's Unicode version, which varies outside ASCII"
	}
}

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

definePure(globalThis, "", ["String", "Number", "Boolean", "BigInt", "Symbol"])
definePure(globalThis, "", [
	"parseInt",
	"parseFloat",
	"isNaN",
	"isFinite",
	"encodeURIComponent",
	"decodeURIComponent",
	"encodeURI",
	"decodeURI"
])
definePure(
	Object,
	"Object",
	["values", "entries", "keys", "isFrozen", "getOwnPropertyNames"],
	{ objects: ["object"], check: withoutArkInternals }
)
definePure(Object, "Object", ["hasOwn"], {
	objects: ["object", undefined],
	check: withoutArkInternals
})
definePure(Object, "Object", ["fromEntries"], {
	objects: ["object"],
	check: withPrimitiveKeys
})
definePure(Object, "Object", ["freeze"], { objects: ["object"], writes: true })
definePure(Object, "Object", ["assign"], {
	objects: ["object"],
	check: args => withoutArkInternals(args) ?? withoutProtoKeys(args),
	writes: true
})
definePure(Array, "Array", ["of", "isArray"], { objects: ["object"] })
definePure(Array, "Array", ["from"], {
	objects: ["object", "callback", "object"],
	check: withPrimitiveLength
})
definePure(
	Number,
	"Number",
	["isInteger", "isSafeInteger", "isFinite", "isNaN"],
	{ objects: ["object"] }
)
definePure(String, "String", ["fromCharCode", "fromCodePoint"])
definePure(String, "String", ["raw"], {
	objects: ["object", undefined],
	check: withPrimitiveStrings
})
definePure(JSON, "JSON", ["parse"], { objects: [undefined, "callback"] })
definePure(JSON, "JSON", ["stringify"], {
	objects: ["object", "callback", undefined],
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

// every engine reads an ISO date, or a date-time with Z or an offset, as one instant if its fields are in range
const isoYear = String.raw`((?!-0{6})[+-]\d{6}|\d{4})`
const isoMonth = String.raw`(0[1-9]|1[0-2])`
const isoDay = String.raw`(0[1-9]|[12]\d|3[01])`
const isoTime = String.raw`T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{3})?)?`
const isoOffset = String.raw`(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)`

const isoInstant = new RegExp(
	`^${isoYear}(?:-${isoMonth}(?:-${isoDay})?)?(?:${isoTime}${isoOffset})?$`
)

const isIsoInstant = (s: string): boolean => {
	const parts = isoInstant.exec(s)
	if (!parts) return false
	const [, year, month = "01", day = "01"] = parts
	const date = new Date(0)
	date.setUTCFullYear(+year, +month - 1, +day)
	return date.getUTCDate() === +day
}

export const pureConstructors = new Map<Function, PureBuiltin>([
	[RegExp, { name: "RegExp", objects: ["RegExp", undefined] }],
	[
		Date,
		{
			name: "Date",
			check: args =>
				(
					args.length === 1 &&
					(typeof args[0] === "number" ||
						(typeof args[0] === "string" && isIsoInstant(args[0])))
				) ?
					undefined
				: !args.length ? "reads the clock"
				: typeof args[0] === "string" ?
					"reads the time zone, or a format each engine parses its own way"
				:	"reads the time zone"
		}
	]
])

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
	["normalize", "toLowerCase", "toUpperCase", "trim", "trimEnd", "trimStart"],
	{ check: asciiOnly }
)
defineMethods("number", Number, [
	"toExponential",
	"toFixed",
	"toPrecision",
	"toString",
	"valueOf"
])
defineMethods("boolean", Boolean, ["toString", "valueOf"])
defineMethods("bigint", BigInt, ["toString", "valueOf"])
defineMethods("array", Array, ["at", "flat", "slice", "toReversed"], {
	objectElements: true
})
defineMethods("array", Array, ["concat"], {
	objects: ["object"],
	objectElements: true
})
defineMethods("array", Array, ["toSpliced"], {
	objects: [undefined, undefined, "object"],
	objectElements: true
})
defineMethods("array", Array, ["with"], {
	objects: [undefined, "object"],
	objectElements: true
})
defineMethods("array", Array, ["join"])
defineMethods(
	"array",
	Array,
	[
		"every",
		"filter",
		"find",
		"findIndex",
		"findLast",
		"findLastIndex",
		"flatMap",
		"map",
		"reduce",
		"reduceRight",
		"some"
	],
	{ objects: ["callback", "object"], objectElements: true }
)
// engines sort differently by a comparator that is not consistent
defineMethods("array", Array, ["toSorted"], {
	objects: ["callback"],
	check: args =>
		args[0] === undefined ?
			undefined
		:	"sorts by a comparator, whose order the spec leaves to each engine unless it is consistent"
})
defineMethods("array", Array, ["includes", "indexOf", "lastIndexOf"], {
	objects: ["object", undefined],
	objectElements: true,
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
