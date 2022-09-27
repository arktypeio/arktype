import type { KeySet } from "@re-/tools"
import { keySet } from "@re-/tools"
import { comparatorChars } from "../operator/unary/bound/common.js"

export class scanner<Lookahead extends string = string> {
    private chars: string[]
    private i: number

    constructor(def: string) {
        this.chars = [...def]
        this.i = 0
    }

    /** Get lookahead and advance scanner by one */
    shift() {
        return (this.chars[this.i++] ?? "END") as Lookahead
    }

    get lookahead() {
        return (this.chars[this.i] ?? "END") as Lookahead
    }

    shiftUntil(
        condition: scanner.UntilCondition,
        opts?: scanner.ShiftUntilOptions
    ): string {
        let shifted = opts?.appendTo ?? ""
        while (!condition(this, shifted)) {
            if (this.lookahead === "END") {
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
        return this.shiftUntil(scanner.lookaheadIsTerminator)
    }

    get unscanned() {
        return this.chars.slice(this.i, this.chars.length).join("")
    }

    lookaheadIs<Char extends Lookahead>(char: Char): this is scanner<Char> {
        return this.lookahead === char
    }

    lookaheadIsIn<Tokens extends KeySet>(
        tokens: Tokens
    ): this is scanner<Extract<keyof Tokens, string>> {
        return this.lookahead in tokens
    }
}

export namespace scanner {
    export type UntilCondition = (scanner: scanner, shifted: string) => boolean

    export type OnInputEndFn = (scanner: scanner, shifted: string) => string

    export type ShiftUntilOptions = {
        onInputEnd?: OnInputEndFn
        inclusive?: boolean
        appendTo?: string
    }

    export const lookaheadIsTerminator: UntilCondition = (r: scanner) =>
        r.lookahead in terminatingChars

    export const terminatingChars = keySet({
        ...comparatorChars,
        "?": 1,
        "|": 1,
        "&": 1,
        ")": 1,
        "[": 1,
        " ": 1,
        "%": 1
    })
}

export namespace Scanner {
    export type Shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`

    export type ShiftUntil<
        Unscanned extends string,
        TerminatingChar extends string,
        Scanned extends string = ""
    > = Unscanned extends Scanner.Shift<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends TerminatingChar
            ? [Scanned, Unscanned]
            : ShiftUntil<
                  NextUnscanned,
                  TerminatingChar,
                  `${Scanned}${Lookahead}`
              >
        : [Scanned, ""]

    export type Shifted<Scanned extends string, Unscanned extends string> = [
        Scanned,
        Unscanned
    ]

    export type TerminatingChar = keyof typeof scanner.terminatingChars
}
