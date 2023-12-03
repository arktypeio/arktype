import type { evaluate } from "./generics.js"
import type { listable } from "./lists.js"
import type { Entry, entryOf, fromEntries } from "./records.js"
import type { intersectUnion } from "./unionToTuple.js"

type objectFromListableEntries<transformed extends readonly Entry[]> = evaluate<
	intersectUnion<fromEntries<transformed>>
>

type arrayFromListableEntries<
	transformed extends Entry,
	result extends unknown[] = []
> = [transformed] extends [never]
	? result
	: Extract<transformed, Entry<result["length"]>> extends infer next extends
				Entry
	  ? Exclude<transformed, next> extends infer remaining extends Entry
			? [transformed] extends [remaining]
				? [...result, ...transformed[1][]]
				: arrayFromListableEntries<remaining, [...result, next[1]]>
			: never
	  : [...result, ...transformed[1][]]

type extractEntrySets<e extends listable<Entry>> = e extends readonly Entry[]
	? e
	: [e]

type extractEntries<e extends listable<Entry>> = e extends readonly Entry[]
	? e[number]
	: e

export function map<
	const o extends object,
	transformed extends listable<Entry<number>>
>(
	o: o,
	flatMapEntry: (...entry: entryOf<o>) => transformed
): arrayFromListableEntries<extractEntries<transformed>>
export function map<
	const o extends object,
	transformed extends listable<Entry>
>(
	o: o,
	flatMapEntry: (...entry: entryOf<o>) => transformed
): objectFromListableEntries<extractEntrySets<transformed>>
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
export function map(
	o: object,
	flatMapEntry: (...entry: Entry<any>) => listable<Entry>
): any {
	const entries: Entry[] = Object.entries(o).flatMap((entry) => {
		const result = flatMapEntry(...entry)
		const entrySet =
			Array.isArray(result[0]) || result.length === 0
				? // if we have an empty array (for filtering) or an array with
				  // another array as its first element, treat it as a list of
				  (result as Entry[])
				: // otherwise, it should be a single entry, so nest it in a tuple
				  // so it doesn't get spread when the result is flattened
				  [result as Entry]
		return entrySet
	})
	const objectResult = Object.fromEntries(entries)
	return typeof entries[0][0] === "number"
		? Object.assign([], objectResult)
		: objectResult
}
