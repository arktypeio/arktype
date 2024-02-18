import type { NumberLiteral } from "./numericLiterals.js"
import { isArray } from "./objectKinds.js"
import type { mutable } from "./records.js"

export type pathToString<
	segments extends string[],
	delimiter extends string = "/"
> = segments extends [] ? "/" : join<segments, delimiter>

export type join<
	segments extends string[],
	delimiter extends string,
	result extends string = ""
> = segments extends [infer head extends string, ...infer tail extends string[]]
	? join<
			tail,
			delimiter,
			result extends "" ? head : `${result}${delimiter}${head}`
	  >
	: result

export type split<
	s extends string,
	delimiter extends string,
	current extends string = "",
	result extends string[] = []
> = s extends `${infer head}${infer tail}`
	? head extends delimiter
		? split<tail, delimiter, "", [...result, current]>
		: split<tail, delimiter, `${current}${head}`, result>
	: [...result, current]

export const getPath = (root: unknown, path: string[]): unknown => {
	let result: any = root
	for (const segment of path) {
		if (typeof result !== "object" || result === null) {
			return undefined
		}
		result = result[segment]
	}
	return result
}

export const intersectUniqueLists = <item>(
	l: readonly item[],
	r: readonly item[]
) => {
	const intersection = [...l]
	for (const item of r) {
		if (!l.includes(item)) {
			intersection.push(item)
		}
	}
	return intersection
}

export type filter<
	t extends readonly unknown[],
	constraint,
	result extends unknown[] = []
> = t extends readonly [infer head, ...infer tail]
	? filter<
			tail,
			constraint,
			head extends constraint ? [...result, head] : result
	  >
	: result

export type List<t = unknown> = readonly t[]

export type listable<t> = t | readonly t[]

export type NonEmptyList<t = unknown> = readonly [t, ...t[]]

export type CollapsingList<t = unknown> =
	| readonly []
	| t
	| readonly [t, t, ...t[]]

export type tail<t extends readonly unknown[]> = t extends readonly [
	unknown,
	...infer tail
]
	? tail
	: never

export type head<t extends readonly unknown[]> = t extends readonly [
	infer head,
	...unknown[]
]
	? head
	: never

export type last<t extends readonly unknown[]> = t extends readonly [
	...unknown[],
	infer last
]
	? last
	: never

export type numericStringKeyOf<t extends readonly unknown[]> = Extract<
	keyof t,
	NumberLiteral
>

export const listFrom = <t>(data: t) =>
	(Array.isArray(data) ? data : [data]) as t extends readonly unknown[]
		? [t] extends [null]
			? // check for any/never
			  t[]
			: t
		: t[]

export const spliterate = <item, included extends item>(
	list: readonly item[],
	by: (item: item) => item is included
) => {
	const result: [included: included[], excluded: Exclude<item, included>[]] = [
		[],
		[]
	]
	for (const item of list) {
		if (by(item)) {
			result[0].push(item)
		} else {
			result[1].push(item as any)
		}
	}
	return result
}

export const ReadonlyArray = Array as unknown as new <T>(
	...args: ConstructorParameters<typeof Array<T>>
) => ReadonlyArray<T>

export const includes = <array extends readonly unknown[]>(
	array: array,
	element: unknown
): element is array[number] => array.includes(element)

export const range = (length: number): number[] =>
	[...new Array(length)].map((_, i) => i)

/**
 * Appends a value to an array, returning the array
 * (based on the implementation from TypeScript's codebase)
 *
 * @param to The array to which `value` is to be appended. If `to` is `undefined`, a new array
 * is created if `value` was appended.
 * @param value The value to append to the array. If `value` is `undefined`, nothing is
 * appended.
 */
export const append = <
	to extends element[] | undefined,
	element extends {} | null,
	value extends element | undefined
>(
	to: to,
	value: value
): Exclude<to, undefined> | Extract<value & to, undefined> => {
	if (value === undefined) {
		return to as never
	}
	if (to === undefined) {
		return [value] as never
	}
	to.push(value)
	return to as never
}

/**
 * Concatenates an element or list with a readonly list
 *
 * @param {to} to - The base list.
 * @param {elementOrList} elementOrList - The element or list to concatenate.
 */
export const conflatenate = <to extends readonly unknown[]>(
	to: to | undefined,
	elementOrList: listable<to[number]> | undefined
): to => {
	if (elementOrList === undefined) {
		return to ?? ([] as never)
	}
	if (to === undefined) {
		return listFrom(elementOrList) as never
	}
	return to.concat(elementOrList) as never
}

/**
 * Concatenates a variadic list of elements or lists with a readonly list
 *
 * @param {to} to - The base list.
 * @param {elementsOrLists} elementsOrLists - The elements or lists to concatenate.
 */
export const conflatenateAll = <to extends readonly unknown[]>(
	to: to | undefined,
	...elementsOrLists: (listable<to[number]> | undefined)[]
): to => elementsOrLists.reduce(conflatenate, to ?? ([] as never))

/**
 * Appends a value to an array if it is not already included, returning the array
 *
 * @param to The array to which `value` is to be appended. If `to` is `undefined`, a new array
 * is created including only `value`.
 * @param value The value to append to the array. If `to` includes `value`, nothing is appended.
 */
export const appendUnique = <to extends unknown[]>(
	to: to | undefined,
	value: to[number]
) => {
	if (to === undefined) {
		return [value] as never
	}
	if (!to.includes(value)) {
		to.push(value)
	}
	return to
}

export type groupableKeyOf<t> = {
	[k in keyof t]: t[k] extends PropertyKey ? k : never
}[keyof t]

export type groupBy<element, discriminator extends groupableKeyOf<element>> = {
	[k in element[discriminator] & PropertyKey]?: Extract<
		element,
		{ [_ in discriminator]: k }
	>[]
} & {}

export const groupBy = <element, discriminator extends groupableKeyOf<element>>(
	array: readonly element[],
	discriminator: discriminator
): groupBy<element, discriminator> =>
	array.reduce<Record<PropertyKey, any>>((result, item) => {
		const key = item[discriminator] as never
		result[key] ??= []
		result[key].push(item)
		return result
	}, {})
