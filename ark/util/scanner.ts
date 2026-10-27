import type { KeySet } from "./records.ts"
import { Backslash, whitespaceChars, type WhitespaceChar } from "./strings.ts"

export class Scanner<lookahead extends string = string> {
	chars: string[]
	i: number
	def: string

	constructor(def: string) {
		this.def = def
		this.chars = [...def]
		this.i = 0
	}

	/** Get lookahead and advance scanner by one */
	shift(): this["lookahead"] {
		return (this.chars[this.i++] ?? "") as never
	}

	get lookahead(): lookahead {
		return (this.chars[this.i] ?? "") as never
	}

	get nextLookahead(): string {
		return this.chars[this.i + 1] ?? ""
	}

	get length(): number {
		return this.chars.length
	}

	shiftUntil(condition: Scanner.UntilCondition): string {
		let shifted = ""
		while (this.lookahead) {
			if (condition(this, shifted)) break
			else shifted += this.shift()
		}
		return shifted
	}

	shiftUntilEscapable(
		condition: Scanner.UntilCondition,
		escapeEscape: typeof Backslash | "" = ""
	): string {
		let shifted = ""
		while (this.lookahead) {
			if (this.lookahead === Backslash) {
				this.shift()
				if (condition(this, shifted)) shifted += this.shift()
				else if (this.lookahead === Backslash)
					shifted += `${escapeEscape}${this.shift()}`
				else shifted += `${Backslash}${this.shift()}`
			} else if (condition(this, shifted)) break
			else shifted += this.shift()
		}
		return shifted
	}

	shiftUntilNext(charOrSet: string | KeySet): string {
		return typeof charOrSet === "string" ?
				this.shiftUntil(s => s.lookahead === charOrSet)
			:	this.shiftUntil(s => s.lookahead in charOrSet)
	}

	/** shifts past whitespace, returning what it shifted */
	skipSpace(): string {
		return this.shiftUntil(() => !(this.lookahead in whitespaceChars))
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

	lookaheadIs<char extends lookahead>(char: char): this is Scanner<char> {
		return this.lookahead === char
	}

	lookaheadIsIn<keySet extends KeySet>(
		tokens: keySet
	): this is Scanner<Extract<keyof keySet, string>> {
		return this.lookahead in tokens
	}
}

export declare namespace Scanner {
	export type UntilCondition = (scanner: Scanner, shifted: string) => boolean

	export type shift<
		lookahead extends string,
		unscanned extends string
	> = `${lookahead}${unscanned}`

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
			: escaped extends shift<infer lookahead, infer nextUnscanned> ?
				shiftUntilEscapable<
					nextUnscanned,
					terminator,
					escapeEscape,
					`${appendTo}${head}${lookahead extends terminator ? ""
					: lookahead extends Backslash ? escapeEscape
					: Backslash}${lookahead}`
				>
			:	[`${appendTo}${head}${Backslash}`, ""]
		: unscanned extends `${infer scanned}${terminator}${infer rest}` ?
			[`${appendTo}${scanned}`, `${terminator}${rest}`]
		:	[`${appendTo}${unscanned}`, ""]

	export type shiftUntilNot<
		unscanned extends string,
		nonTerminator extends string,
		appendTo extends string = ""
	> =
		unscanned extends shift<infer lookahead, infer nextUnscanned> ?
			lookahead extends nonTerminator ?
				shiftUntilNot<nextUnscanned, nonTerminator, `${appendTo}${lookahead}`>
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
