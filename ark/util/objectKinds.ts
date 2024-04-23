import type { array } from "./arrays.js"
import { type Domain, type domainDescriptions, domainOf } from "./domain.js"
import { type Key, isKeyOf } from "./records.js"

// Built-in object constructors based on a subset of:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const builtinObjectKinds = {
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
} as const satisfies ObjectKindSet

export type ObjectKindSet = Record<string, Constructor>

export type BuiltinObjectConstructors = typeof builtinObjectKinds

export type BuiltinObjectKind = keyof BuiltinObjectConstructors

export type BuiltinObjects = {
	[kind in BuiltinObjectKind]: InstanceType<BuiltinObjectConstructors[kind]>
}

export type objectKindOf<
	data extends object,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
> =
	object extends data ? keyof kinds | undefined
	: data extends (...args: never[]) => unknown ? "Function"
	: instantiableObjectKind<data, kinds> extends never ? keyof kinds | undefined
	: instantiableObjectKind<data, kinds>

export type describeObject<o extends object> =
	objectKindOf<o> extends string ? objectKindDescriptions[objectKindOf<o>]
	:	domainDescriptions["object"]

type instantiableObjectKind<
	data extends object,
	kinds extends ObjectKindSet
> = {
	[kind in keyof kinds]: data extends InstanceType<kinds[kind]> ? kind : never
}[keyof kinds]

export const objectKindOf = <
	data extends object,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
>(
	data: data,
	kinds?: kinds
): objectKindOf<data, kinds> | undefined => {
	const kindSet: ObjectKindSet = kinds ?? builtinObjectKinds
	let prototype: Partial<Object> | null = Object.getPrototypeOf(data)
	while (
		prototype?.constructor &&
		(!kindSet[prototype.constructor.name] ||
			!(data instanceof kindSet[prototype.constructor.name]))
	) 
		prototype = Object.getPrototypeOf(prototype)
	
	const name = prototype?.constructor?.name
	if (name === undefined || name === "Object") 
		return undefined
	
	return name as never
}

export const objectKindOrDomainOf = <
	data,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
>(
	data: data,
	kinds?: kinds
): (objectKindOf<data & object, kinds> & {}) | domainOf<data> =>
	(typeof data === "object" && data !== null ?
		objectKindOf(data, kinds) ?? "object"
	:	domainOf(data)) as never

export type objectKindOrDomainOf<
	data,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
> =
	data extends object ?
		objectKindOf<data, kinds> extends undefined ?
			"object"
		:	objectKindOf<data, kinds>
	:	domainOf<data>

export const hasObjectKind = <
	kind extends keyof kinds,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
>(
	data: object,
	kind: kind,
	kinds?: kinds
): data is InstanceType<kinds[kind]> =>
	objectKindOf(data, kinds) === (kind as never)

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
				isKeyOf(constructorName, builtinObjectKinds) &&
				builtinObjectKinds[constructorName] === ctor
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
		for (const k of Object.getOwnPropertyNames(curr)) {
			if (k !== "constructor" && !result.includes(k)) 
				result.push(k)
			
		}
		for (const symbol of Object.getOwnPropertySymbols(curr)) {
			if (!result.includes(symbol)) 
				result.push(symbol)
			
		}
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
		if (current === base.prototype) 
			return true
		

		current = Object.getPrototypeOf(current)
	}
	return false
}
