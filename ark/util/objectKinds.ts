import type { array } from "./arrays.ts"
import type { DescribeOptions } from "./describe.ts"
import { type Domain, type domainDescriptions, domainOf } from "./domain.ts"
import type { Fn } from "./functions.ts"
import { type Key, isKeyOf } from "./records.ts"

export type builtinConstructors = {
	Array: ArrayConstructor
	Date: DateConstructor
	Error: ErrorConstructor
	Function: FunctionConstructor
	Map: MapConstructor
	RegExp: RegExpConstructor
	Set: SetConstructor
	String: StringConstructor
	Number: NumberConstructor
	Boolean: BooleanConstructor
	WeakMap: WeakMapConstructor
	WeakSet: WeakSetConstructor
	Promise: PromiseConstructor
}

// Built-in object constructors based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const builtinConstructors: builtinConstructors = {
	Array,
	Date,
	Error,
	Function,
	Map,
	RegExp,
	Set,
	String,
	Number,
	Boolean,
	WeakMap,
	WeakSet,
	Promise
}

export type BuiltinObjectConstructors = typeof builtinConstructors

export type BuiltinObjectKind = keyof BuiltinObjectConstructors

export type BuiltinObjects = {
	[kind in BuiltinObjectKind]: InstanceType<BuiltinObjectConstructors[kind]>
}

export type objectKindOf<data extends object> =
	object extends data ? keyof builtinConstructors | undefined
	: data extends Fn ? "Function"
	: instantiableObjectKind<data> extends never ?
		keyof builtinConstructors | undefined
	:	instantiableObjectKind<data>

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

export const isArray = (data: unknown): data is array => Array.isArray(data)

/** Each defaultObjectKind's completion for the phrase "must be _____" */
export const objectKindDescriptions = {
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
} as const satisfies Record<BuiltinObjectKind, string>

export type objectKindDescriptions = typeof objectKindDescriptions

// this will only return an object kind if it's the root constructor
// example TypeError would return undefined not 'Error'
export const getExactBuiltinConstructorName = (
	ctor: unknown
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

/** Mimics output of TS's keyof operator at runtime */
export const prototypeKeysOf = <t>(value: t): normalizedKeyOf<t>[] => {
	const result: Key[] = []
	let curr = value
	while (curr !== Object.prototype && curr !== null && curr !== undefined) {
		for (const k of Object.getOwnPropertyNames(curr))
			if (k !== "constructor" && !result.includes(k)) result.push(k)

		for (const symbol of Object.getOwnPropertySymbols(curr))
			if (!result.includes(symbol)) result.push(symbol)

		curr = Object.getPrototypeOf(curr)
	}
	return result as never
}

const baseKeysByDomain: Record<Domain, readonly Key[]> = {
	bigint: prototypeKeysOf(0n),
	boolean: prototypeKeysOf(false),
	null: [],
	number: prototypeKeysOf(0),
	// TS doesn't include the Object prototype in keyof, so keyof object is never
	object: [],
	string: prototypeKeysOf(""),
	symbol: prototypeKeysOf(Symbol()),
	undefined: []
}

export const getBaseDomainKeys = <domain extends Domain>(
	domain: domain
): Key[] => [...baseKeysByDomain[domain]]

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
