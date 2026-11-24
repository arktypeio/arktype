export type Region = "text" | "code"

/**
 * A run of non-whitespace characters on one line that share a category.
 * `line` and `column` are 0-based; `column` and `length` count UTF-16 code
 * units, as JavaScript strings do.
 */
export type Span = {
	line: number
	column: number
	length: number
	text: string
	category: string
	/** `text`: in a host string or comment; `code`: elsewhere (oracle output only) */
	region?: Region
	/** the category without the ArkType extension */
	baseCategory?: string
	/** the TextMate scope stack, root first (oracle output only) */
	scopes?: string[]
}

export type HighlightFixture = {
	source: string
	spans: Span[]
}

export type CharCategory = {
	category: string
	region?: Region
	baseCategory?: string
	scopes?: string[]
}

const sameRun = (a: CharCategory, b: CharCategory) =>
	a.category === b.category &&
	a.region === b.region &&
	a.baseCategory === b.baseCategory &&
	(a.scopes ?? []).join(" ") === (b.scopes ?? []).join(" ")

/** Groups per-character categories into maximal runs, skipping whitespace and unset characters. */
export const toSpans = (
	lines: string[],
	chars: (CharCategory | undefined)[][]
): Span[] => {
	const spans: Span[] = []
	for (const [line, text] of lines.entries()) {
		let open: (Span & CharCategory) | undefined
		for (let column = 0; column <= text.length; column++) {
			const char = text[column]
			const c =
				column < text.length && !/\s/.test(char) ?
					chars[line][column]
				:	undefined
			if (open && c && sameRun(open, c)) {
				open.length++
				open.text += char
				continue
			}
			if (open) spans.push(open)
			open =
				c ?
					{
						line,
						column,
						length: 1,
						text: char,
						category: c.category,
						region: c.region ?? "text",
						...(c.baseCategory === undefined ?
							{}
						:	{ baseCategory: c.baseCategory }),
						...(c.scopes ? { scopes: c.scopes } : {})
					}
				:	undefined
		}
	}
	return spans
}

/** Expands spans back into a per-character lookup keyed by `line:column`. */
export const toCharMap = (spans: Span[]): Map<string, Span> => {
	const map = new Map<string, Span>()
	for (const span of spans) {
		for (let i = 0; i < span.length; i++)
			map.set(`${span.line}:${span.column + i}`, span)
	}
	return map
}
