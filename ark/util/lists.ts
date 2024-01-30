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
	element extends {},
	value extends element | undefined
>(
	to: to,
	value: value
): to | Extract<value, undefined> => {
	if (value === undefined) {
		return to
	}
	if (to === undefined) {
		return [value] as never
	}
	to.push(value)
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
