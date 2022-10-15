import type { KeySet } from "@arktype/tools"
import { keySet } from "@arktype/tools"

export class Scanner<Lookahead extends string = string> {
    private chars: string[]
    private i: number
    hasBeenFinalized = false

    constructor(def: string) {
        this.chars = [...def]
        this.i = 0
    }

    /** Get lookahead and advance scanner by one */
    shift() {
        return (this.chars[this.i++] ?? "") as Lookahead
    }

    get lookahead() {
        return (this.chars[this.i] ?? "") as Lookahead
    }

    shiftUntil(
        condition: Scanner.UntilCondition,
        opts?: Scanner.ShiftUntilOptions
    ): string {
        let shifted = opts?.appendTo ?? ""
        while (!condition(this, shifted)) {
            if (this.lookahead === "") {
                return opts?.onInputEnd?.(this, shifted) ?? shifted
            }
            shifted += this.shift()
        }

        if (opts?.inclusive) {
            shifted += this.shift()
        }
        return shifted
    }

    shiftUntilNextTerminator() {
        return this.shiftUntil(Scanner.lookaheadIsTerminator)
    }

    get unscanned() {
        return this.chars.slice(this.i, this.chars.length).join("")
    }

    lookaheadIs<Char extends Lookahead>(char: Char): this is Scanner<Char> {
        return this.lookahead === char
    }

    lookaheadIsIn<Tokens extends KeySet>(
        tokens: Tokens
    ): this is Scanner<Extract<keyof Tokens, string>> {
        return this.lookahead in tokens
    }
}

export namespace Scanner {
    export type UntilCondition = (scanner: Scanner, shifted: string) => boolean

    export type OnInputEndFn = (scanner: Scanner, shifted: string) => string

    export type ShiftUntilOptions = {
        onInputEnd?: OnInputEndFn
        inclusive?: boolean
        appendTo?: string
    }

    export const lookaheadIsTerminator: UntilCondition = (r: Scanner) =>
        r.lookahead in terminatingChars

    export const terminatingChars = keySet({
        "<": 1,
        ">": 1,
        "=": 1,
        "?": 1,
        "|": 1,
        "&": 1,
        ")": 1,
        "[": 1,
        "%": 1,
        " ": 1
    })

    export type TerminatingChar = keyof typeof Scanner.terminatingChars

    export type shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`

    export type tailOf<S> = S extends `${string}${infer Tail}` ? Tail : ""

    export type shiftUntil<
        Unscanned extends string,
        Terminator extends string,
        Scanned extends string = ""
    > = Unscanned extends Scanner.shift<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends Terminator
            ? [Scanned, Unscanned]
            : shiftUntil<NextUnscanned, Terminator, `${Scanned}${Lookahead}`>
        : [Scanned, ""]

    export type shiftUntilNextTerminator<Unscanned extends string> = shiftUntil<
        Unscanned,
        TerminatingChar
    >

    export type ShiftResult<
        Scanned extends string,
        Unscanned extends string
    > = [Scanned, Unscanned]
}
