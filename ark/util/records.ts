import { hasDomain } from "./domain.ts"
import { type Fn } from "./functions.ts"
import type { defined, evaluate } from "./generics.ts"
import { isArray } from "./objectKinds.ts"
import type { intersectUnion } from "./unionToTuple.ts"

export type Dict<k extends string = string, v = unknown> = {
	readonly [_ in k]: v
}

/** Either:
 * A, with all properties of B undefined
 * OR
 * B, with all properties of A undefined
 **/
export type propwiseXor<a, b> =
	| evaluate<a & { [k in keyof b]?: undefined }>
	| evaluate<b & { [k in keyof a]?: undefined }>

export type requireKeys<o, key extends keyof o> = o & {
	[requiredKey in key]-?: defined<o[requiredKey]>
}

export type PartialRecord<k extends string = string, v = unknown> = {
	[_ in k]?: v
}

export type keySet<key extends string = string> = { readonly [_ in key]?: 1 }

export type mutable<o, maxDepth extends number = 1> = mutableRecurse<
	o,
	[],
	maxDepth
>

type mutableRecurse<
	o,
	depth extends 1[],
	maxDepth extends number
> = depth["length"] extends maxDepth
	? o
	: o extends object
	? o extends Fn
		? o
		: {
				-readonly [k in keyof o]: mutableRecurse<o[k], [...depth, 1], maxDepth>
		  }
	: o

export type entryOf<o> = {
	[k in keyof o]-?: [k, o[k] & ({} | null)]
}[o extends readonly unknown[] ? keyof o & number : keyof o] &
	unknown

export type entriesOf<o extends object> = entryOf<o>[]

export const entriesOf = <o extends object>(o: o) =>
	Object.entries(o) as entriesOf<o>

type Entry<key extends PropertyKey = PropertyKey, value = unknown> = readonly [
	key: key,
	value: value
]

export type fromEntries<entries extends readonly Entry[]> = evaluate<{
	[entry in entries[number] as entry[0]]: entry[1]
}>

export const fromEntries = <const entries extends readonly Entry[]>(
	entries: entries
) => Object.fromEntries(entries) as fromEntries<entries>

export const transform = <
	const o extends object,
	transformed extends Entry | readonly Entry[]
>(
	o: o,
	flatMapEntry: (entry: entryOf<o>) => transformed
) =>
	Object.fromEntries(
		entriesOf(o).flatMap((entry) => {
			const result = flatMapEntry(entry)
			return isArray(result[0]) ? (result as never) : [result]
		})
	) as evaluate<
		intersectUnion<
			fromEntries<
				transformed extends readonly Entry[] ? transformed : [transformed]
			>
		>
	>

/** Mimics the result of Object.keys(...) */
export type keysOf<o> = o extends readonly unknown[]
	? number extends o["length"]
		? `${number}`
		: keyof o & `${number}`
	: {
			[K in keyof o]: K extends string ? K : K extends number ? `${K}` : never
	  }[keyof o]

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keysOf<o>[]

export const isKeyOf = <k extends string | number | symbol, obj extends object>(
	k: k,
	obj: obj
): k is Extract<keyof obj, k> => k in obj

export type requiredKeyOf<o> = {
	[k in keyof o]-?: o extends { [_ in k]-?: o[k] } ? k : never
}[keyof o]

export type optionalKeyOf<o> = Exclude<keyof o, requiredKeyOf<o>>

export type optionalizeKeys<o, keys extends keyof o> = evaluate<
	{ [k in Exclude<keyof o, keys>]: o[k] } & {
		[k in keys]?: o[k]
	}
>

export type replaceKey<o, k extends keyof o, v> = evaluate<
	Omit<o, k> & { [_ in k]: v }
>

export type valueOf<o> = o[keyof o]

const ShallowClone = class {
	constructor(properties: object) {
		Object.assign(this, properties)
	}
} as new <t extends object>(base: t) => t

// @ts-expect-error (needed to extend `t`, but safe given ShallowClone's implementation)
export class DynamicBase<t extends object> extends ShallowClone<t> {}

const NoopBase = class {} as new <t extends object>() => t

// @ts-expect-error
export class CastableBase<t extends object> extends NoopBase<t> {}

export const shallowClone = <input extends object>(input: input): input =>
	Object.create(
		Object.getPrototypeOf(input),
		Object.getOwnPropertyDescriptors(input)
	)
