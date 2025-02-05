import { append, type array, type listable } from "./arrays.ts"
import type { conform, show } from "./generics.ts"
import type { Key } from "./keys.ts"
import type { Entry, entryOf } from "./records.ts"
import type { intersectUnion } from "./unionToTuple.ts"

type objectFromListableEntries<transformed extends readonly GroupableEntry[]> =
	show<intersectUnion<fromGroupableEntries<transformed>>>

type fromGroupableEntries<entries extends readonly GroupableEntry[]> = {
	[entry in entries[number] as entry extends GroupedEntry ? entry[0]["group"]
	:	conform<entry[0], PropertyKey>]: entry extends GroupedEntry ? entry[1][]
	:	entry[1]
}

type arrayFromListableEntries<transformed extends Entry> =
	Entry<number, never> extends transformed ? transformed[1][]
	:	_arrayFromListableEntries<transformed, []>

type _arrayFromListableEntries<
	transformed extends Entry,
	result extends unknown[]
> =
	[transformed] extends [never] ? result
	: Extract<transformed, Entry<result["length"]>> extends (
		infer next extends Entry
	) ?
		Exclude<transformed, next> extends infer remaining extends Entry ?
			[transformed] extends [remaining] ?
				[...result, ...transformed[1][]]
			:	_arrayFromListableEntries<remaining, [...result, next[1]]>
		:	never
	:	[...result, ...transformed[1][]]

type extractEntrySets<e extends listable<GroupableEntry>> =
	e extends readonly GroupableEntry[] ? e : [e]

type extractEntries<e extends listable<Entry>> =
	e extends readonly Entry[] ? e[number] : e

type entryArgsWithIndex<o> = {
	[k in keyof o]-?: [k: k, v: Exclude<o[k], undefined>, i: number]
}[keyof o]

type numericArrayEntry<a extends array> =
	number extends a["length"] ? [number, a[number]]
	:	{
			[i in keyof a]: i extends `${infer n extends number}` ? [n, a[i]] : never
		}[number]

export type GroupedEntry = readonly [key: { group: Key }, value: unknown]

export type GroupableEntry = Entry<Key> | Entry<number> | GroupedEntry

export type ListableEntry = listable<GroupableEntry>

export type fromMappedEntries<transformed extends ListableEntry> =
	[transformed] extends [listable<Entry<number>>] ?
		arrayFromListableEntries<extractEntries<transformed>>
	:	objectFromListableEntries<extractEntrySets<transformed>>

export type FlatMorph = {
	<const o extends array, transformed extends ListableEntry>(
		o: o,
		flatMapEntry: (...args: numericArrayEntry<o>) => transformed
	): fromMappedEntries<transformed>

	<const o extends object, transformed extends ListableEntry>(
		o: o,
		flatMapEntry: (...args: entryOf<o>) => transformed
	): fromMappedEntries<transformed>

	<const o extends object, transformed extends ListableEntry>(
		o: o,
		flatMapEntry: (...args: entryArgsWithIndex<o>) => transformed
	): fromMappedEntries<transformed>
}

export const flatMorph: FlatMorph = (
	o: object,
	flatMapEntry: (...args: any[]) => listable<GroupableEntry>
): any => {
	const result: any = {}
	const inputIsArray = Array.isArray(o)
	let outputShouldBeArray = false

	Object.entries(o).forEach((entry, i) => {
		const mapped =
			inputIsArray ? flatMapEntry(i, entry[1]) : flatMapEntry(...entry, i)

		outputShouldBeArray ||= typeof mapped[0] === "number"

		const flattenedEntries =
			Array.isArray(mapped[0]) || mapped.length === 0 ?
				// if we have an empty array (for filtering) or an array with
				// another array as its first element, treat it as a list
				(mapped as GroupableEntry[])
				// otherwise, it should be a single entry, so nest it in a tuple
				// so it doesn't get spread when the result is flattened
			:	[mapped as GroupableEntry]

		flattenedEntries.forEach(([k, v]) => {
			if (typeof k === "object") result[k.group] = append(result[k.group], v)
			else result[k] = v
		})
	})

	return outputShouldBeArray ? Object.values(result) : result
}
