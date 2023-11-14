import type { Domain } from "./domain.ts"
import { domainOf } from "./domain.ts"
import { type Fn } from "./functions.ts"
import type { evaluate } from "./generics.ts"
import { isKeyOf } from "./records.ts"

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
> = object extends data
	? keyof kinds | undefined
	: data extends Fn
	? "Function"
	: instantiableObjectKind<data, kinds> extends never
	? keyof kinds | undefined
	: instantiableObjectKind<data, kinds>

type instantiableObjectKind<
	data extends object,
	kinds extends ObjectKindSet
> = {
	[kind in keyof kinds]: kinds[kind] extends Constructor<data> ? kind : never
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
	) {
		prototype = Object.getPrototypeOf(prototype)
	}
	const name = prototype?.constructor?.name
	if (name === undefined || name === "Object") {
		return undefined
	}
	return name as never
}

export const objectKindOrDomainOf = <
	data,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
>(
	data: data,
	kinds?: kinds
) =>
	(typeof data === "object" && data !== null
		? objectKindOf(data, kinds) ?? "object"
		: domainOf(data)) as
		| (objectKindOf<data & object, kinds> & {})
		| domainOf<data>

export type objectKindOrDomainOf<
	data,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
> = data extends object
	? objectKindOf<data, kinds> extends undefined
		? "object"
		: objectKindOf<data, kinds>
	: domainOf<data>

export const hasObjectKind = <
	kind extends keyof kinds,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
>(
	data: object,
	kind: kind,
	kinds?: kinds
): data is InstanceType<kinds[kind]> =>
	objectKindOf(data, kinds) === (kind as never)

export const isArray = (data: unknown): data is readonly unknown[] =>
	Array.isArray(data)

/** Each defaultObjectKind's completion for the phrase "Must be _____" */
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

// this will only return an object kind if it's the root constructor
// example TypeError would return undefined not 'Error'
export const getExactBuiltinConstructorName = (
	constructor: unknown
): BuiltinObjectKind | undefined => {
	const constructorName: string | undefined = Object(constructor).name
	return constructorName &&
		isKeyOf(constructorName, builtinObjectKinds) &&
		builtinObjectKinds[constructorName] === constructor
		? constructorName
		: undefined
}

export type Constructor<instance = {}> = abstract new (
	...args: never[]
) => instance

export type instanceOf<constructor> = constructor extends Constructor<
	infer instance
>
	? instance
	: never

/** Mimics output of TS's keyof operator at runtime */
export const prototypeKeysOf = <t>(value: t): evaluate<keyof t>[] => {
	const result: (string | symbol)[] = []
	while (value !== Object.prototype && value !== null && value !== undefined) {
		for (const k of Object.getOwnPropertyNames(value)) {
			if (k !== "constructor" && !result.includes(k)) {
				result.push(k)
			}
		}
		for (const symbol of Object.getOwnPropertySymbols(value)) {
			if (!result.includes(symbol)) {
				result.push(symbol)
			}
		}
		value = Object.getPrototypeOf(value)
	}
	return result as evaluate<keyof t>[]
}

const baseKeysByDomain: Record<Domain, readonly PropertyKey[]> = {
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

export const getBaseDomainKeys = <domain extends Domain>(domain: domain) => [
	...baseKeysByDomain[domain]
]

export const constructorExtends = (
	constructor: Constructor,
	base: Constructor
) => {
	let current = constructor.prototype

	while (current !== null) {
		if (current === base.prototype) {
			return true
		}

		current = Object.getPrototypeOf(current)
	}
	return false
}
