import type { Dict, KeySet } from "./records.ts"
import { escapeChar, whitespaceChars } from "./strings.ts"

export class Scanner<lookahead extends string = string> {
	protected chars: string[]
	protected i: number

	constructor(
		public def: string,
		public terminatingChars: KeySet
	) {
		this.chars = [...def]
		this.i = 0
	}

	/** Get lookahead and advance scanner by one */
	shift(): lookahead {
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
			if (condition(this, shifted)) {
				if (shifted[shifted.length - 1] === escapeChar)
					shifted = shifted.slice(0, -1)
				else break
			}
			shifted += this.shift()
		}
		return shifted
	}

	shiftUntilNextTerminator(): string {
		this.shiftUntilNonWhitespace()
		return this.shiftUntil(() => this.lookahead in this.terminatingChars)
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

	lookaheadIsIn<tokens extends Dict>(
		tokens: tokens
	): this is Scanner<Extract<keyof tokens, string>> {
		return this.lookahead in tokens
	}
}

export declare namespace Scanner {
	export type UntilCondition = (scanner: Scanner, shifted: string) => boolean
}
