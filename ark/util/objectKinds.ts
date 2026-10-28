import type { DescribeOptions } from "./describe.ts"
import { type domainDescriptions, domainOf } from "./domain.ts"
import { throwParseError } from "./errors.ts"
import { functionNameOf, prototypeOf } from "./facts.ts"
import type { Fn } from "./functions.ts"
import type { anyOrNever, satisfy, show } from "./generics.ts"
import { tryParseNumber } from "./numbers.ts"
import { defineProperties, isKeyOf } from "./records.ts"

// ECMAScript Objects
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const ecmascriptConstructorsOf = () => ({
	Array,
	Boolean,
	Date,
	Error,
	Function,
	Map,
	Number,
	Promise,
	RegExp,
	Set,
	String,
	WeakMap,
	WeakSet
})

export const ecmascriptConstructors: ecmascriptConstructors =
	/* @__PURE__ */ ecmascriptConstructorsOf()

export type ecmascriptConstructors = ReturnType<typeof ecmascriptConstructorsOf>

// we have to narrow instantiateConstructors here since a lot of the builtin defaults use `any`
export type EcmascriptObjects = satisfy<
	instantiateConstructors<keyof ecmascriptConstructors>,
	{
		Array: Array<unknown>
		Boolean: Boolean
		Date: Date
		Error: Error
		Function: Function
		Map: Map<unknown, unknown>
		Number: Number
		RegExp: RegExp
		Set: Set<unknown>
		String: String
		WeakMap: WeakMap<object, unknown>
		WeakSet: WeakSet<object>
		Promise: Promise<unknown>
	}
>

// globals are read in PURE IIFEs so unused ones tree-shake
/** Node18 */
export const FileConstructor: typeof File = /* @__PURE__ */ (() =>
	globalThis.File ?? globalThis.Blob)()

// need to type these explicitly due to a resolution issue
export type platformConstructors = {
	ArrayBuffer: ArrayBufferConstructor
	Blob: typeof Blob
	File: typeof File
	FormData: typeof FormData
	Headers: typeof Headers
	Request: typeof Request
	Response: typeof Response
	URL: typeof URL
}

// Platform APIs
// See https://developer.mozilla.org/en-US/docs/Web/API
// Must be implemented in Node etc. as well as the browser to include here
const platformConstructorsOf = (): platformConstructors => ({
	ArrayBuffer,
	Blob: globalThis.Blob,
	// Node loads a module for File, and undici for the rest, on first read
	get File() {
		return globalThis.File ?? globalThis.Blob
	},
	get FormData() {
		return globalThis.FormData
	},
	get Headers() {
		return globalThis.Headers
	},
	get Request() {
		return globalThis.Request
	},
	get Response() {
		return globalThis.Response
	},
	URL: globalThis.URL
})

export const platformConstructors: platformConstructors =
	/* @__PURE__ */ platformConstructorsOf()

// unlike InstanceType, reading a prototype doesn't resolve its signatures' parameters
export type PlatformObjects = {
	// unavailable constructors are never as in instantiateConstructors
	[k in keyof platformConstructors]: [platformConstructors[k]] extends (
		[anyOrNever]
	) ?
		never
	: platformConstructors[k] extends { prototype: infer instance } ? instance
	: never
}

const typedArrayConstructorsOf = () => ({
	Int8Array,
	Uint8Array,
	Uint8ClampedArray,
	Int16Array,
	Uint16Array,
	Int32Array,
	Uint32Array,
	Float32Array,
	Float64Array,
	BigInt64Array,
	BigUint64Array
})

export const typedArrayConstructors: typedArrayConstructors =
	/* @__PURE__ */ typedArrayConstructorsOf()

export type typedArrayConstructors = ReturnType<typeof typedArrayConstructorsOf>

export type TypedArrayObjects = instantiateConstructors<
	keyof typedArrayConstructors
>

export type builtinConstructors = ecmascriptConstructors &
	platformConstructors &
	typedArrayConstructors

// Built-in object constructors based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
let builtins: builtinConstructors | undefined

// a bundle reading only objectKindOf builds these at its first call
const builtinsOf = (): builtinConstructors =>
	(builtins ??= defineProperties(
		defineProperties(
			Object.assign({}, ecmascriptConstructorsOf()),
			platformConstructorsOf()
		),
		typedArrayConstructorsOf()
	))

export const builtinConstructors: builtinConstructors =
	/* @__PURE__ */ builtinsOf()

export type BuiltinObjectKind = keyof builtinConstructors

export type GlobalName = keyof typeof globalThis

type instantiateConstructors<kind extends BuiltinObjectKind> = {
	// a constructor that failed to resolve because TS is configured in such a
	// way that it is unavailable is never rather than any:
	// https://github.com/arktypeio/arktype/issues/1246
	[k in kind]: [builtinConstructors[k]] extends [anyOrNever] ? never
	:	InstanceType<builtinConstructors[k]>
}

export type BuiltinObjects = instantiateConstructors<BuiltinObjectKind>

export type objectKindOf<data extends object> =
	object extends data ? keyof builtinConstructors | undefined
	: data extends Fn ? "Function"
	: instantiableObjectKind<data> extends never ? undefined
	: instantiableObjectKind<data>

export type describeObject<
	o extends object,
	opts extends DescribeOptions = {}
> =
	objectKindOf<o> extends string ?
		[opts["includeArticles"]] extends [true] ?
			objectKindDescriptions[objectKindOf<o>]
		:	objectKindOf<o>
	: [opts["includeArticles"]] extends [true] ? domainDescriptions["object"]
	: "object"

type instantiableObjectKind<data extends object> = {
	[kind in keyof builtinConstructors]: data extends (
		InstanceType<builtinConstructors[kind]>
	) ?
		kind
	:	never
}[keyof builtinConstructors]

export const objectKindOf = <data extends object>(
	data: data
): objectKindOf<data> | undefined => {
	// Realm-safe: cross-window/vm arrays fail `instanceof Array` but pass
	// Array.isArray (https://github.com/arktypeio/arktype/issues/1597).
	if (Array.isArray(data)) return "Array" as never

	const constructors = builtinsOf()
	let prototype: Partial<Object> | null = prototypeOf(data)
	while (
		prototype?.constructor &&
		(!isKeyOf(prototype.constructor.name, constructors) ||
			constructors[prototype.constructor.name]?.prototype !== prototype)
	)
		prototype = Object.getPrototypeOf(prototype)

	const name = prototype?.constructor?.name
	if (name === undefined || name === "Object") return undefined

	return name as never
}

export const objectKindOrDomainOf = <data>(
	data: data
): (objectKindOf<data & object> & {}) | domainOf<data> =>
	(typeof data === "object" && data !== null ?
		(objectKindOf(data) ?? "object")
	:	domainOf(data)) as never

export type objectKindOrDomainOf<data> =
	data extends object ?
		objectKindOf<data> extends undefined ?
			"object"
		:	objectKindOf<data>
	:	domainOf<data>

export const hasObjectKind = <kind extends keyof builtinConstructors>(
	data: object,
	kind: kind
): data is InstanceType<builtinConstructors[kind]> =>
	objectKindOf(data) === (kind as never)

export const isArray: (data: unknown) => data is readonly unknown[] =
	/* @__PURE__ */ (() => Array.isArray)()
export const dateGetTime = /* @__PURE__ */ (() => Date.prototype.getTime)()

// undefined for an object only inheriting Date.prototype, whose methods throw
export const timeOf = (date: Date): number | undefined => {
	try {
		return date.getTime === dateGetTime ?
				date.getTime()
			:	dateGetTime.call(date)
	} catch {
		return undefined
	}
}

// repeats timeOf, whose call measurably slows validating a Date
export const isValidDate = (date: Date): boolean => {
	try {
		return !Number.isNaN(
			date.getTime === dateGetTime ? date.getTime() : dateGetTime.call(date)
		)
	} catch {
		return false
	}
}

export const isDateObject = (value: object): value is Date =>
	prototypeOf(value) === Date.prototype

export const isRegExpObject = (value: object): value is RegExp =>
	prototypeOf(value) === RegExp.prototype

export const writeInvalidDateMessage = <source extends string>(
	source: source
): writeInvalidDateMessage<source> =>
	`Date literal '${source}' must be an ISO date like 2025-01-01, an ISO date-time with Z or an offset like 2025-01-01T12:00Z, or epoch milliseconds`

export type writeInvalidDateMessage<source extends string> =
	`Date literal '${source}' must be an ISO date like 2025-01-01, an ISO date-time with Z or an offset like 2025-01-01T12:00Z, or epoch milliseconds`

export type DateParseResult<
	errorOnFail extends boolean | string = boolean | string
> = Date | (errorOnFail extends true | string ? never : undefined)

export const tryParseDate = <errorOnFail extends boolean | string>(
	source: string,
	errorOnFail?: errorOnFail
): DateParseResult<errorOnFail> => {
	const isoParts = isoInstantMatcher.exec(source)
	if (isoParts) {
		const [, year, month = "01", day = "01"] = isoParts
		const stringParsedDate = new Date(source)
		if (isValidDate(stringParsedDate) && isDayOfMonth(+year, +month, +day))
			return stringParsedDate
	} else {
		const epochMillis = tryParseNumber(source)
		if (epochMillis !== undefined) {
			const numberParsedDate = new Date(epochMillis)
			if (isValidDate(numberParsedDate)) return numberParsedDate
		}
	}
	return errorOnFail ?
			throwParseError(
				errorOnFail === true ? writeInvalidDateMessage(source) : errorOnFail
			)
		:	(undefined as never)
}

// a date alone is UTC, but a time without Z or an offset would be local
const isoInstantMatcher =
	/^((?!-0{6})[+-]\d{6}|\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/

const isDayOfMonth = (year: number, month: number, day: number) => {
	const date = new Date(0)
	date.setUTCFullYear(year, month - 1, day)
	return date.getUTCDate() === day
}

export const ecmascriptDescriptions = {
	Array: "an array",
	Function: "a function",
	Date: "a Date",
	RegExp: "a RegExp",
	Error: "an Error",
	Map: "a Map",
	Set: "a Set",
	String: "a String object",
	Number: "a Number object",
	Boolean: "a Boolean object",
	Promise: "a Promise",
	WeakMap: "a WeakMap",
	WeakSet: "a WeakSet"
} as const satisfies Record<keyof EcmascriptObjects, string>

export const platformDescriptions = {
	ArrayBuffer: "an ArrayBuffer instance",
	Blob: "a Blob instance",
	File: "a File instance",
	FormData: "a FormData instance",
	Headers: "a Headers instance",
	Request: "a Request instance",
	Response: "a Response instance",
	URL: "a URL instance"
}

export const typedArrayDescriptions = {
	Int8Array: "an Int8Array",
	Uint8Array: "a Uint8Array",
	Uint8ClampedArray: "a Uint8ClampedArray",
	Int16Array: "an Int16Array",
	Uint16Array: "a Uint16Array",
	Int32Array: "an Int32Array",
	Uint32Array: "a Uint32Array",
	Float32Array: "a Float32Array",
	Float64Array: "a Float64Array",
	BigInt64Array: "a BigInt64Array",
	BigUint64Array: "a BigUint64Array"
} as const satisfies Record<keyof typedArrayConstructors, string>

/** Each defaultObjectKind's completion for the phrase "must be _____" */
export const objectKindDescriptions: objectKindDescriptions =
	/* @__PURE__ */ Object.assign(
		{},
		ecmascriptDescriptions,
		platformDescriptions,
		typedArrayDescriptions
	) satisfies Record<BuiltinObjectKind, string>

export type objectKindDescriptions = Readonly<
	show<
		typeof ecmascriptDescriptions &
			typeof platformDescriptions &
			typeof typedArrayDescriptions
	>
>

/**
 * this will only return an object kind if it's the root constructor
 * example TypeError would return null not 'Error'
 **/
export const getBuiltinNameOfConstructor = (
	ctor: Function
): BuiltinObjectKind | null => {
	const constructorName: string | null = functionNameOf(Object(ctor)) ?? null
	return (
			constructorName &&
				isKeyOf(constructorName, builtinConstructors) &&
				builtinConstructors[constructorName] === ctor
		) ?
			constructorName
		:	null
}

export type Constructor<instance = {}> = abstract new (
	...args: never[]
) => instance

export type instanceOf<constructor> =
	constructor extends Constructor<infer instance> ? instance : never

/**
 * Returns an array of constructors for all ancestors (i.e., prototypes) of a given object.
 */
export const ancestorsOf = (o: object): Function[] => {
	let proto = Object.getPrototypeOf(o)
	const result: Function[] = []
	while (proto !== null) {
		result.push(proto.constructor)
		proto = Object.getPrototypeOf(proto)
	}
	return result
}

/** whether an object is an array, or has the prototype of a literal or none */
export const isPlainObjectOrArray = (o: object): boolean => {
	const proto = Object.getPrototypeOf(o)
	return proto === Object.prototype || proto === null || Array.isArray(o)
}

export type normalizedKeyOf<t> =
	keyof t extends infer k ?
		k extends number ?
			`${k}`
		:	k
	:	never
