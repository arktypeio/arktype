import type { DescribeOptions } from "./describe.ts"
import { type domainDescriptions, domainOf } from "./domain.ts"
import type { Fn } from "./functions.ts"
import type { satisfy } from "./generics.ts"
import { isKeyOf } from "./records.ts"

// ECMAScript Objects
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const ecmascriptConstructors = {
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
}

export type ecmascriptConstructors = typeof ecmascriptConstructors

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

/** Node18 */
export const FileConstructor = globalThis.File ?? Blob

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
export const platformConstructors: platformConstructors = {
	ArrayBuffer,
	Blob,
	File: FileConstructor,
	FormData,
	Headers,
	Request,
	Response,
	URL
}

export type PlatformObjects = instantiateConstructors<
	keyof platformConstructors
>

export const typedArrayConstructors = {
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
}

export type typedArrayConstructors = typeof typedArrayConstructors

export type TypedArrayObjects = instantiateConstructors<
	keyof typedArrayConstructors
>

// Built-in object constructors based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const builtinConstructors = {
	...ecmascriptConstructors,
	...platformConstructors,
	...typedArrayConstructors,
	String,
	Number,
	Boolean
}

export type builtinConstructors = typeof builtinConstructors

export type BuiltinObjectKind = keyof builtinConstructors

export type GlobalName = keyof typeof globalThis

type instantiateConstructors<kind extends BuiltinObjectKind> = {
	// one of these conditions will always be true internally, but they prevent
	// failed resolutions from being inferred as any if TS is configured
	// in such a way that they are unavailable:
	// https://github.com/arktypeio/arktype/issues/1246
	[k in kind]: k extends GlobalName ? InstanceType<(typeof globalThis)[k]>
	: `${k}Constructor` extends GlobalName ?
		InstanceType<(typeof globalThis)[`${k}Constructor`]>
	:	never
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
	let prototype: Partial<Object> | null = Object.getPrototypeOf(data)
	while (
		prototype?.constructor &&
		(!isKeyOf(prototype.constructor.name, builtinConstructors) ||
			!(data instanceof builtinConstructors[prototype.constructor.name]))
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
	Array.isArray

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
export const objectKindDescriptions = {
	...ecmascriptDescriptions,
	...platformDescriptions,
	...typedArrayDescriptions
} as const satisfies Record<BuiltinObjectKind, string>

export type objectKindDescriptions = typeof objectKindDescriptions

/**
 * this will only return an object kind if it's the root constructor
 * example TypeError would return null not 'Error'
 **/
export const getBuiltinNameOfConstructor = (
	ctor: Function
): BuiltinObjectKind | null => {
	const constructorName: string | null = Object(ctor).name ?? null
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
 *
 * @param {object} o - The object to find the ancestors of.
 * @returns {Function[]} An array of constructors for all ancestors of the object.
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

export type normalizedKeyOf<t> =
	keyof t extends infer k ?
		k extends number ?
			`${k}`
		:	k
	:	never

export const constructorExtends = (
	ctor: Constructor,
	base: Constructor
): boolean => {
	let current = ctor.prototype

	while (current !== null) {
		if (current === base.prototype) return true

		current = Object.getPrototypeOf(current)
	}
	return false
}
