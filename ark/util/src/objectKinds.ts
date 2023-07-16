import type { Domain } from "./domains.js"
import { domainOf } from "./domains.js"
import type { evaluate } from "./generics.js"
import { isKeyOf } from "./records.js"

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
	Object,
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
	data,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
> = unknown extends data
	? undefined | keyof kinds
	: data extends object
	? object extends data
		? keyof kinds
		: {
				[kind in keyof kinds]: kinds[kind] extends Constructor<data>
					? kind
					: data extends (...args: never[]) => unknown
					? "Function"
					: "Object"
		  }[keyof kinds]
	: undefined

export const objectKindOf = <
	data,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
>(
	data: data,
	kinds?: kinds
) => {
	if (domainOf(data) !== "object") {
		return undefined
	}
	const kindSet: ObjectKindSet = kinds ?? builtinObjectKinds
	let prototype: Partial<Object> = Object.getPrototypeOf(data)
	while (
		prototype?.constructor &&
		(!kindSet[prototype.constructor.name] ||
			!(data instanceof kindSet[prototype.constructor.name]))
	) {
		prototype = Object.getPrototypeOf(prototype)
	}
	return prototype?.constructor?.name as objectKindOf<data, kinds>
}

export const hasObjectKind = <
	kind extends keyof kinds,
	kinds extends ObjectKindSet = BuiltinObjectConstructors
>(
	data: unknown,
	kind: kind,
	kinds?: kinds
): data is InstanceType<kinds[kind]> => objectKindOf(data, kinds) === kind

export const isArray = (data: unknown): data is readonly unknown[] =>
	Array.isArray(data)

/** Each defaultObjectKind's completion for the phrase "Must be _____" */
export const objectKindDescriptions = {
	Object: "an object",
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

export type Constructor<instance = {}> = new (...args: never[]) => instance

export type AbstractableConstructor<instance = {}> = abstract new (
	...args: never[]
) => instance

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
	constructor: AbstractableConstructor,
	base: AbstractableConstructor
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
