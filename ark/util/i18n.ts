export type ListType = "or" | "and"

export interface ListPattern {
	/** between exactly two items */
	readonly two: string
	/** between items before the last */
	readonly middle: string
	/** before the last of three or more */
	readonly end: string
}

export const listPattern =
	(or: ListPattern, and: ListPattern) =>
	(items: readonly string[], type: ListType): string => {
		const pattern = type === "or" ? or : and
		if (items.length < 2) return items[0] ?? ""
		if (items.length === 2) return `${items[0]}${pattern.two}${items[1]}`
		return `${items.slice(0, -1).join(pattern.middle)}${pattern.end}${items[items.length - 1]}`
	}

/** wraps text in FSI and PDI so its direction can't reorder the text around it */
export const isolate = (text: string): string => `\u2068${text}\u2069`
