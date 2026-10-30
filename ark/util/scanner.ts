import type { KeySet } from "./records.ts"
import { Backslash, whitespaceChars, type WhitespaceChar } from "./strings.ts"

// the escapes JSON.stringify writes for a control character
const namedControlEscapes = {
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "\t"
} as const

type NamedControlEscapes = typeof namedControlEscapes

const controlEscapes = {
	"0000": "\u0000",
	"0001": "\u0001",
	"0002": "\u0002",
	"0003": "\u0003",
	"0004": "\u0004",
	"0005": "\u0005",
	"0006": "\u0006",
	"0007": "\u0007",
	"0008": "\u0008",
	"0009": "\u0009",
	"000a": "\u000a",
	"000b": "\u000b",
	"000c": "\u000c",
	"000d": "\u000d",
	"000e": "\u000e",
	"000f": "\u000f",
	"0010": "\u0010",
	"0011": "\u0011",
	"0012": "\u0012",
	"0013": "\u0013",
	"0014": "\u0014",
	"0015": "\u0015",
	"0016": "\u0016",
	"0017": "\u0017",
	"0018": "\u0018",
	"0019": "\u0019",
	"001a": "\u001a",
	"001b": "\u001b",
	"001c": "\u001c",
	"001d": "\u001d",
	"001e": "\u001e",
	"001f": "\u001f"
} as const

type ControlEscapes = typeof controlEscapes

export class Scanner<peek extends string = string> {
	chars: string[]
	i: number
	def: string

	constructor(def: string) {
		this.def = def
		this.chars = [...def]
		this.i = 0
	}

	/** the next character, advancing past it */
	shift(): this["peek"] {
		return (this.chars[this.i++] ?? "") as never
	}

	/** the next character, or "" at the end */
	get peek(): peek {
		return (this.chars[this.i] ?? "") as never
	}

	/** the character after the next, or "" past the end */
	get peekNext(): string {
		return this.chars[this.i + 1] ?? ""
	}

	get length(): number {
		return this.chars.length
	}

	shiftUntil(condition: Scanner.UntilCondition): string {
		let shifted = ""
		while (this.peek) {
			if (condition(this, shifted)) break
			else shifted += this.shift()
		}
		return shifted
	}

	/**
	 * shifts until condition holds, reading `\` before the terminator as the
	 * terminator and `\\` as escapeEscape followed by a backslash. Where
	 * escapeEscape is "", as in a literal, the escapes JSON writes for a
	 * control character are read as that character, so a literal's expression
	 * parses back to it
	 */
	shiftUntilEscapable(
		condition: Scanner.UntilCondition,
		escapeEscape: typeof Backslash | "" = ""
	): string {
		let shifted = ""
		while (this.peek) {
			if (this.peek === Backslash) {
				this.shift()
				if (condition(this, shifted)) shifted += this.shift()
				else if (this.peek === Backslash)
					shifted += `${escapeEscape}${this.shift()}`
				else if (escapeEscape === "") shifted += this.shiftControlEscape()
				else shifted += `${Backslash}${this.shift()}`
			} else if (condition(this, shifted)) break
			else shifted += this.shift()
		}
		return shifted
	}

	/** the control character escaped after a backslash, or the backslash as written */
	private shiftControlEscape(): string {
		const peek = this.peek
		if (peek in namedControlEscapes) {
			this.shift()
			return namedControlEscapes[peek as keyof NamedControlEscapes]
		}
		if (peek === "u") {
			const code = this.chars.slice(this.i + 1, this.i + 5).join("")
			if (code.toLowerCase() in controlEscapes) {
				this.jumpForward(5)
				return controlEscapes[code.toLowerCase() as keyof ControlEscapes]
			}
		}
		return `${Backslash}${this.shift()}`
	}

	shiftUntilNext(charOrSet: string | KeySet): string {
		return typeof charOrSet === "string" ?
				this.shiftUntil(s => s.peek === charOrSet)
			:	this.shiftUntil(s => s.peek in charOrSet)
	}

	/** shifts past whitespace, returning what it shifted */
	skipSpace(): string {
		return this.shiftUntil(() => !(this.peek in whitespaceChars))
	}

	jumpForward(count: number): void {
		this.i += count
	}

	get location(): number {
		return this.i
	}

	get unscanned(): string {
		return this.chars.slice(this.i, this.length).join("")
	}

	get scanned(): string {
		return this.chars.slice(0, this.i).join("")
	}

	sliceChars(start: number, end?: number): string {
		return this.chars.slice(start, end).join("")
	}

	peekIs<char extends peek>(char: char): this is Scanner<char> {
		return this.peek === char
	}

	peekIsIn<keySet extends KeySet>(
		tokens: keySet
	): this is Scanner<Extract<keyof keySet, string>> {
		return this.peek in tokens
	}
}

export declare namespace Scanner {
	export type UntilCondition = (sc: Scanner, shifted: string) => boolean

	export type shift<
		peek extends string,
		unscanned extends string
	> = `${peek}${unscanned}`

	export type shiftUntil<
		unscanned extends string,
		terminator extends string,
		appendTo extends string = ""
	> =
		unscanned extends `${infer first}${infer second}${infer rest}` ?
			first extends terminator ? [appendTo, unscanned]
			: second extends terminator ? [`${appendTo}${first}`, `${second}${rest}`]
			: shiftUntil<rest, terminator, `${appendTo}${first}${second}`>
		: unscanned extends terminator ? [appendTo, unscanned]
		: [`${appendTo}${unscanned}`, ""]

	export type shiftUntilEscapable<
		unscanned extends string,
		terminator extends string,
		escapeEscape extends Backslash | "",
		appendTo extends string = ""
	> =
		// skip ahead to the first backslash, then the first terminator before it
		unscanned extends `${infer head}${Backslash}${infer escaped}` ?
			head extends `${infer scanned}${terminator}${infer rest}` ?
				[`${appendTo}${scanned}`, `${terminator}${rest}${Backslash}${escaped}`]
			: escaped extends shift<infer peek, infer nextUnscanned> ?
				peek extends terminator ?
					shiftUntilEscapable<
						nextUnscanned,
						terminator,
						escapeEscape,
						`${appendTo}${head}${peek}`
					>
				: peek extends Backslash ?
					shiftUntilEscapable<
						nextUnscanned,
						terminator,
						escapeEscape,
						`${appendTo}${head}${escapeEscape}${peek}`
					>
				: escapeEscape extends "" ?
					shiftControlEscape<escaped> extends (
						[infer char extends string, infer rest extends string]
					) ?
						shiftUntilEscapable<
							rest,
							terminator,
							escapeEscape,
							`${appendTo}${head}${char}`
						>
					:	never
				:	shiftUntilEscapable<
						nextUnscanned,
						terminator,
						escapeEscape,
						`${appendTo}${head}${Backslash}${peek}`
					>
			:	[`${appendTo}${head}${Backslash}`, ""]
		: unscanned extends `${infer scanned}${terminator}${infer rest}` ?
			[`${appendTo}${scanned}`, `${terminator}${rest}`]
		:	[`${appendTo}${unscanned}`, ""]

	/** the control character escaped after a backslash, or the backslash as written */
	type shiftControlEscape<escaped extends string> =
		escaped extends shift<infer peek, infer rest> ?
			peek extends keyof NamedControlEscapes ? [NamedControlEscapes[peek], rest]
			: escaped extends (
				`u${infer h1}${infer h2}${infer h3}${infer h4}${infer afterCode}`
			) ?
				Lowercase<`${h1}${h2}${h3}${h4}`> extends (
					infer code extends keyof ControlEscapes
				) ?
					[ControlEscapes[code], afterCode]
				:	[`${Backslash}${peek}`, rest]
			:	[`${Backslash}${peek}`, rest]
		:	never

	export type shiftUntilNot<
		unscanned extends string,
		nonTerminator extends string,
		appendTo extends string = ""
	> =
		unscanned extends shift<infer peek, infer nextUnscanned> ?
			peek extends nonTerminator ?
				shiftUntilNot<nextUnscanned, nonTerminator, `${appendTo}${peek}`>
			:	[appendTo, unscanned]
		:	[appendTo, ""]

	export type skipWhitespace<unscanned extends string> = shiftUntilNot<
		unscanned,
		WhitespaceChar
	>[1]

	export type shiftResult<scanned extends string, unscanned extends string> = [
		scanned,
		unscanned
	]
}

export const writeUnmatchedGroupCloseMessage = <
	char extends string,
	unscanned extends string
>(
	char: char,
	unscanned: unscanned
): writeUnmatchedGroupCloseMessage<char, unscanned> =>
	`Unmatched ${char}${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

export type writeUnmatchedGroupCloseMessage<
	char extends string,
	unscanned extends string
> = `Unmatched ${char}${unscanned extends "" ? "" : ` before ${unscanned}`}`

export const writeUnclosedGroupMessage = <missingChar extends string>(
	missingChar: missingChar
): writeUnclosedGroupMessage<missingChar> => `Missing ${missingChar}`

export type writeUnclosedGroupMessage<missingChar extends string> =
	`Missing ${missingChar}`
