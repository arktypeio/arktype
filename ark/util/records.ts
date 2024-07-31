import type { array } from "./arrays.js"
import { flatMorph } from "./flatMorph.js"
import type { defined, show } from "./generics.js"

export type Dict<k extends string = string, v = unknown> = {
	readonly [_ in k]: v
}

export type dict<v = unknown, k extends string = string> = {
	[_ in k]: v
}

/** Either:
 * A, with all properties of B undefined
 * OR
 * B, with all properties of A undefined
 **/
export type propwiseXor<a, b> =
	| show<a & { [k in keyof b]?: undefined }>
	| show<b & { [k in keyof a]?: undefined }>

export type requireKeys<o, key extends keyof o> = o & {
	[requiredKey in key]-?: defined<o[requiredKey]>
}

export type require<o, maxDepth extends number = 1> = _require<o, [], maxDepth>

type _require<o, depth extends 1[], maxDepth extends number> =
	depth["length"] extends maxDepth ? o
	: o extends object ?
		o extends (...args: never[]) => unknown ?
			o
		:	{
				[k in keyof o]-?: _require<o[k], [...depth, 1], maxDepth>
			}
	:	o

export type PartialRecord<k extends PropertyKey = PropertyKey, v = unknown> = {
	[_ in k]?: v
}

export type keySet<key extends string = string> = { readonly [_ in key]?: 1 }

export type keySetOf<o extends object> = keySet<Extract<keyof o, string>>

export type mutable<o, maxDepth extends number = 1> = _mutable<o, [], maxDepth>

type _mutable<o, depth extends 1[], maxDepth extends number> =
	depth["length"] extends maxDepth ? o
	: o extends object ?
		o extends (...args: never[]) => unknown ?
			o
		:	{
				-readonly [k in keyof o]: _mutable<o[k], [...depth, 1], maxDepth>
			}
	:	o

export type entryOf<o> = {
	[k in keyof o]-?: [k, o[k] & ({} | null)]
}[o extends array ? keyof o & number : keyof o] &
	unknown

export type entriesOf<o extends object> = entryOf<o>[]

export const entriesOf = <o extends object>(o: o): entriesOf<o> =>
	Object.entries(o) as never

export type Entry<
	key extends PropertyKey = PropertyKey,
	value = unknown
> = readonly [key: key, value: value]

export type fromEntries<entries extends readonly Entry[]> = show<{
	[entry in entries[number] as entry[0]]: entry[1]
}>

export const fromEntries = <const entries extends readonly Entry[]>(
	entries: entries
): fromEntries<entries> => Object.fromEntries(entries) as never

/** Mimics the result of Object.keys(...) */
export type keyOf<o> =
	o extends array ?
		number extends o["length"] ?
			`${number}`
		:	keyof o & `${number}`
	:	{
			[k in keyof o]: k extends string ? k
			: k extends number ? `${k}`
			: never
		}[keyof o]

export const keysOf = <o extends object>(o: o): keyOf<o>[] =>
	Object.keys(o) as never

export const isKeyOf = <k extends string | number | symbol, o extends object>(
	k: k,
	o: o
): k is Extract<keyof o, k> => k in o

/** Coalesce keys that exist on one or more branches of a union */
export type unionKeyOf<t> = t extends unknown ? keyof t : never

export type extractKeyed<o extends object, k extends unionKeyOf<o>> = Extract<
	o,
	{ [_ in k]?: unknown }
>

export const hasKey = <o extends object, k extends unionKeyOf<o>>(
	o: o,
	k: k
): o is extractKeyed<o, k> => k in o

export type extractDefinedKey<o extends object, k extends unionKeyOf<o>> = show<
	extractKeyed<o, k> & { [_ in k]: {} | null }
>

// must be defined this way to avoid https://github.com/microsoft/TypeScript/issues/55049
export const hasDefinedKey: <o extends object, k extends unionKeyOf<o>>(
	o: o,
	k: k
) => o is extractDefinedKey<o, k> = (o, k): o is any =>
	(o as any)[k] !== undefined

export type requiredKeyOf<o> = {
	[k in keyof o]-?: o extends { [_ in k]-?: o[k] } ? k : never
}[keyof o]

export type optionalKeyOf<o> = Exclude<keyof o, requiredKeyOf<o>>

export type merge<base, props> =
	base extends unknown ?
		props extends unknown ?
			show<omit<base, keyof base & keyof props> & props>
		:	props
	:	never

export type override<
	base,
	merged extends { [k in keyof base]?: unknown }
> = merge<base, merged>

export type propValueOf<o> = o[keyof o]

export const InnerDynamicBase = class {
	constructor(properties: object) {
		Object.assign(this, properties)
	}
} as new <t extends object>(base: t) => t

/** @ts-expect-error (needed to extend `t`, but safe given ShallowClone's implementation) **/
export class DynamicBase<t extends object> extends InnerDynamicBase<t> {}

export const NoopBase = class {} as new <t extends object>() => t

/** @ts-expect-error (see DynamicBase) **/
export class CastableBase<t extends object> extends NoopBase<t> {}

export const splitByKeys = <o extends object, leftKeys extends keySetOf<o>>(
	o: o,
	leftKeys: leftKeys
): [
	show<Pick<o, keyof leftKeys & keyof o>>,
	show<Omit<o, keyof leftKeys & keyof o>>
] => {
	const l: any = {}
	const r: any = {}
	let k: keyof o
	for (k in o) {
		if (k in leftKeys) l[k] = o[k]
		else r[k] = o[k]
	}
	return [l, r]
}

/** Homomorphic implementation of the builtin Pick.
 *
 * Gives different results for certain union expressions like the following:
 *
 * @example
 * // flattens result to { a?: 1 | 2; b?: 1 | 2 }
 * type PickResult = Pick<{ a: 1; b?: 1 } | { a?: 2; b: 2 }, "a" | "b">
 *
 * @example
 * // preserves original type w/ modifier groupings
 * type pickResult = pick<{ a: 1; b?: 1 } | { a?: 2; b: 2 }, "a" | "b">
 */
export type pick<o, key extends keyof o> =
	o extends unknown ?
		{
			[k in keyof o as k extends key ? k : never]: o[k]
		}
	:	// could also consider adding the following to extract literal keys from
		// index signatures as optional. doesn't match existing TS behavior though:
		//  & { [k in keyof o as key extends k ? key : never]?: o[k] }
		never

export const pick = <o extends object, keys extends keySetOf<o>>(
	o: o,
	keys: keys
): pick<o, keyof keys & keyof o> => splitByKeys(o, keys)[0] as never

/** Homomorphic implementation of the builtin Omit.
 *
 * Gives different results for many union expressions like the following:
 *
 * @example
 * // {}
 * type OmitResult = Omit<{ a: 1 } | { b: 2 }, never>
 *
 * @example
 * // preserves original type w/ modifier groupings
 * type omitResult = omit<{ a: 1 } | { b: 2 }, never>
 */
export type omit<o, key extends keyof o> = {
	[k in keyof o as k extends key ? never : k]: o[k]
}

export const omit = <o extends object, keys extends keySetOf<o>>(
	o: o,
	keys: keys
): omit<o, keyof keys & keyof o> => splitByKeys(o, keys)[1] as never

export type EmptyObject = Record<PropertyKey, never>

export const isEmptyObject = (o: object): o is EmptyObject =>
	Object.keys(o).length === 0

export const stringAndSymbolicEntriesOf = (o: object): Entry<Key>[] => [
	...Object.entries(o),
	...Object.getOwnPropertySymbols(o).map(k => [k, (o as any)[k]] as const)
]

/** Like Object.assign, but it will preserve getters instead of evaluating them. */
export const defineProperties: <base extends object, merged extends object>(
	base: base,
	merged: merged
) => merge<base, merged> = (base, merged) =>
	// declared like this to avoid https://github.com/microsoft/TypeScript/issues/55049
	Object.defineProperties(
		base,
		Object.getOwnPropertyDescriptors(merged)
	) as never

export type Key = string | symbol

export type invert<t extends Record<PropertyKey, PropertyKey>> = {
	[k in t[keyof t]]: {
		[k2 in keyof t]: t[k2] extends k ? k2 : never
	}[keyof t]
} & unknown

export const invert = <t extends Record<PropertyKey, PropertyKey>>(
	t: t
): invert<t> => flatMorph(t as any, (k, v) => [v, k]) as never

export const unset = Symbol("represents an uninitialized value")

export type unset = typeof unset

/**
 *  For each keyof o that also exists on jsDocSource, add associated JsDoc annotations to o.
 *  Does not preserve modifiers on o like optionality.
 */
export type withJsDoc<o, jsDocSource> = show<
	keyof o extends keyof jsDocSource ?
		keyof jsDocSource extends keyof o ?
			_withJsDoc<o, jsDocSource>
		:	Pick<_withJsDoc<o, jsDocSource>, keyof o & keyof jsDocSource>
	:	Pick<_withJsDoc<o, jsDocSource>, keyof o & keyof jsDocSource> & {
			[k in Exclude<keyof o, keyof jsDocSource>]: o[k]
		}
>

type _withJsDoc<o, jsDocSource> = {
	[k in keyof jsDocSource]-?: o[k & keyof o]
}

export type propertyDescriptorsOf<o extends object> = {
	[k in keyof o]: TypedPropertyDescriptor<o[k]>
}
