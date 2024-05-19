import type { isDisjoint } from "./intersections.js"
import type { parseNonNegativeInteger } from "./numericLiterals.js"

export type pathToString<
	segments extends string[],
	delimiter extends string = "/"
> = segments extends [] ? "/" : join<segments, delimiter>

export type join<
	segments extends string[],
	delimiter extends string,
	result extends string = ""
> =
	segments extends [infer head extends string, ...infer tail extends string[]] ?
		join<
			tail,
			delimiter,
			result extends "" ? head : `${result}${delimiter}${head}`
		>
	:	result

export type split<
	s extends string,
	delimiter extends string,
	current extends string = "",
	result extends string[] = []
> =
	s extends `${infer head}${infer tail}` ?
		head extends delimiter ?
			split<tail, delimiter, "", [...result, current]>
		:	split<tail, delimiter, `${current}${head}`, result>
	:	[...result, current]

export const getPath = (root: unknown, path: string[]): unknown => {
	let result: any = root
	for (const segment of path) {
		if (typeof result !== "object" || result === null) return undefined

		result = result[segment]
	}
	return result
}

export const intersectUniqueLists = <item>(
	l: readonly item[],
	r: readonly item[]
): item[] => {
	const intersection = [...l]
	for (const item of r) if (!l.includes(item)) intersection.push(item)

	return intersection
}

export type filter<t extends array, constraint, result extends unknown[] = []> =
	t extends readonly [infer head, ...infer tail] ?
		filter<
			tail,
			constraint,
			head extends constraint ? [...result, head] : result
		>
	:	result

export type array<t = unknown> = readonly t[]

export type listable<t> = t | readonly t[]

export type flattenListable<t> = t extends array<infer element> ? element : t

export type NonEmptyList<t = unknown> = readonly [t, ...t[]]

export type repeat<t extends array, count extends number> = _repeat<
	t,
	[],
	count,
	[]
>

type _repeat<
	base extends array,
	result extends array,
	maxDepth extends number,
	depth extends 1[]
> =
	depth["length"] extends maxDepth ? result
	:	_repeat<base, [...result, ...base], maxDepth, [...depth, 1]>

export type CollapsingList<t = unknown> =
	| readonly []
	| t
	| readonly [t, t, ...t[]]

export type headOf<t extends array> = t[0]

export type tailOf<t extends array> =
	t extends readonly [unknown, ...infer tail] ? tail : never

export type lastIndexOf<t extends array> = tailOf<t>["length"]

export type lastOf<t extends array> = t[lastIndexOf<t>]

export type initOf<t extends array> =
	t extends readonly [...infer init, unknown] ? init : never

export type numericStringKeyOf<t extends array> = Extract<keyof t, `${number}`>

export type indexOf<a extends array> =
	keyof a extends infer k ? parseNonNegativeInteger<k & string> : never

export const arrayFrom = <t>(
	data: t
): t extends array ?
	[t] extends [null] ?
		// check for any/never
		t[]
	:	t
:	t[] => (Array.isArray(data) ? data : [data]) as never

export const spliterate = <item, included extends item>(
	list: readonly item[],
	by: (item: item) => item is included
): [included: included[], excluded: Exclude<item, included>[]] => {
	const result: [any[], any[]] = [[], []]
	for (const item of list) {
		if (by(item)) result[0].push(item)
		else result[1].push(item)
	}
	return result
}

export const ReadonlyArray = Array as unknown as new <T>(
	...args: ConstructorParameters<typeof Array<T>>
) => ReadonlyArray<T>

export const includes = <a extends array>(
	array: a,
	element: unknown
): element is a[number] => array.includes(element)

export const range = (length: number, offset = 0): number[] =>
	[...new Array(length)].map((_, i) => i + offset)

export type AppendOptions = {
	prepend?: boolean
}

/**
 * Adds a value or array to an array, returning the concatenated result
 *
 * @param to The array to which `value` is to be added. If `to` is `undefined`, a new array
 * is created as `[value]` if value was not undefined, otherwise `[]`.
 * @param value The value to add to the array. If `value` is `undefined`, does nothing.
 * @param opts
 * 		prepend: If true, adds the element to the beginning of the array instead of the end
 */
export const append = <
	to extends element[] | undefined,
	element,
	value extends listable<element> | undefined
>(
	to: to,
	value: value,
	opts?: AppendOptions
): Exclude<to, undefined> | Extract<value & to, undefined> => {
	if (value === undefined) return to ?? ([] as any)

	if (to === undefined) {
		return (
			value === undefined ? []
			: Array.isArray(value) ? value
			: ([value] as any)
		)
	}

	if (opts?.prepend)
		Array.isArray(value) ? to.unshift(...value) : to.unshift(value as never)
	else Array.isArray(value) ? to.push(...value) : to.push(value as never)

	return to as never
}

/**
 * Concatenates an element or list with a readonly list
 *
 * @param {to} to - The base list.
 * @param {elementOrList} elementOrList - The element or list to concatenate.
 */
export const conflatenate = <element>(
	to: readonly element[] | undefined | null,
	elementOrList: listable<element> | undefined | null
): readonly element[] => {
	if (elementOrList === undefined || elementOrList === null)
		return to ?? ([] as never)

	if (to === undefined || to === null) return arrayFrom(elementOrList) as never

	return to.concat(elementOrList) as never
}

/**
 * Concatenates a variadic list of elements or lists with a readonly list
 *
 * @param {to} to - The base list.
 * @param {elementsOrLists} elementsOrLists - The elements or lists to concatenate.
 */
export const conflatenateAll = <element>(
	...elementsOrLists: (listable<element> | undefined | null)[]
): readonly element[] =>
	elementsOrLists.reduce<readonly element[]>(conflatenate, [])

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
): to => {
	if (to === undefined) return [value] as never

	if (!to.includes(value)) to.push(value)

	return to
}

export type groupableKeyOf<t> = {
	[k in keyof t]: t[k] extends PropertyKey ? k : never
}[keyof t]

export type groupBy<element, discriminant extends groupableKeyOf<element>> = {
	[k in element[discriminant] & PropertyKey]?: (element extends unknown ?
		isDisjoint<element[discriminant], k> extends true ?
			never
		:	element
	:	never)[]
} & unknown

export const groupBy = <element, discriminant extends groupableKeyOf<element>>(
	array: readonly element[],
	discriminant: discriminant
): groupBy<element, discriminant> =>
	array.reduce<Record<PropertyKey, any>>((result, item) => {
		const key = item[discriminant] as never
		result[key] ??= []
		result[key].push(item)
		return result
	}, {})
