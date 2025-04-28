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
			if (this.lookahead === Backslash) {
				this.shift()
				shifted += this.shift()
			} else if (condition(this, shifted)) break
			else shifted += this.shift()
		}
		return shifted
	}

	shiftUntilLookahead(charOrSet: string | KeySet): string {
		return typeof charOrSet === "string" ?
				this.shiftUntil(s => s.lookahead === charOrSet)
			:	this.shiftUntil(s => s.lookahead in charOrSet)
	}

	shiftUntilNonWhitespace(): string {
		return this.shiftUntil(() => !(this.lookahead in whitespaceChars))
	}

	jumpToIndex(i: number): void {
		this.i = i < 0 ? this.length + i : i
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
		unscanned extends shift<infer lookahead, infer nextUnscanned> ?
			lookahead extends terminator ? [appendTo, unscanned]
			: lookahead extends Backslash ?
				nextUnscanned extends (
					shift<infer nextLookahead, infer postEscapedUnscanned>
				) ?
					shiftUntil<
						postEscapedUnscanned,
						terminator,
						`${appendTo}${nextLookahead}`
					>
				:	[`${appendTo}${Backslash}`, ""]
			:	shiftUntil<nextUnscanned, terminator, `${appendTo}${lookahead}`>
		:	[appendTo, ""]

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

export const writeUnmatchedGroupCloseMessage = <unscanned extends string>(
	unscanned: unscanned
): writeUnmatchedGroupCloseMessage<unscanned> =>
	`Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

export type writeUnmatchedGroupCloseMessage<unscanned extends string> =
	`Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`

export const writeUnclosedGroupMessage = <missingChar extends string>(
	missingChar: missingChar
): writeUnclosedGroupMessage<missingChar> => `Missing ${missingChar}`

export type writeUnclosedGroupMessage<missingChar extends string> =
	`Missing ${missingChar}`
