import type { Dict } from "../../../../dev/utils/src/main.js"
import { isKeyOf } from "../../../../dev/utils/src/main.js"
import type { Comparator } from "../../../nodes/primitive/range.js"

export class Scanner<Lookahead extends string = string> {
    private chars: string[]
    private i: number

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

    get length() {
        return this.chars.length
    }

    shiftUntil(condition: Scanner.UntilCondition): string {
        let shifted = ""
        while (this.lookahead) {
            if (condition(this, shifted)) {
                if (shifted[shifted.length - 1] === Scanner.escapeToken) {
                    shifted = shifted.slice(0, -1)
                } else {
                    break
                }
            }
            shifted += this.shift()
        }
        return shifted
    }

    shiftUntilNextTerminator() {
        this.shiftUntilNonWhitespace()
        return this.shiftUntil(Scanner.lookaheadIsTerminator)
    }

    shiftUntilNonWhitespace() {
        return this.shiftUntil(Scanner.lookaheadIsNotWhitespace)
    }

    jumpToIndex(i: number) {
        this.i = i < 0 ? this.length + i : i
    }

    get location() {
        return this.i
    }

    get unscanned() {
        return this.chars.slice(this.i, this.length).join("")
    }

    get scanned() {
        return this.chars.slice(0, this.i).join("")
    }

    sliceChars(start: number, end?: number) {
        return this.chars.slice(start, end).join("")
    }

    lookaheadIs<Char extends Lookahead>(char: Char): this is Scanner<Char> {
        return this.lookahead === char
    }

    lookaheadIsIn<Tokens extends Dict>(
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
    }

    export const lookaheadIsTerminator: UntilCondition = (scanner: Scanner) =>
        scanner.lookahead in terminatingChars

    export const lookaheadIsNotWhitespace: UntilCondition = (
        scanner: Scanner
    ) => !(scanner.lookahead in whiteSpaceTokens)

    export const terminatingChars = {
        "<": true,
        ">": true,
        "=": true,
        "|": true,
        "&": true,
        ")": true,
        "[": true,
        "%": true,
        " ": true,
        ",": true
    } as const

    export type TerminatingChar = keyof typeof terminatingChars

    export const finalizingLookaheads = {
        ">": true,
        ",": true,
        "": true
    } as const

    export type FinalizingLookahead = keyof typeof finalizingLookaheads

    export type InfixToken = Comparator | "|" | "&" | "%" | ":" | "=>"

    export type PostfixToken = "[]"

    export type OperatorToken = InfixToken | PostfixToken

    export const escapeToken = "\\"

    export type EscapeToken = typeof escapeToken

    export const whiteSpaceTokens = {
        " ": true,
        "\n": true
    } as const

    export type WhiteSpaceToken = keyof typeof whiteSpaceTokens

    export const lookaheadIsFinalizing = (
        lookahead: string,
        unscanned: string
    ): lookahead is ">" | "," =>
        lookahead === ">"
            ? unscanned[0] === "="
                ? // >== would only occur in an expression like Array<number>==5
                  // otherwise, >= would only occur as part of a bound like number>=5
                  unscanned[1] === "="
                : // if > is the end of a generic instantiation, the next token will be an operator or the end of the string
                  unscanned.trimStart() === "" ||
                  isKeyOf(unscanned.trimStart()[0], Scanner.terminatingChars)
            : // if the lookahead is a finalizing token but not >, it's unambiguously a finalizer (currently just ",")
              lookahead === ","

    export type lookaheadIsFinalizing<
        lookahead extends string,
        unscanned extends string
    > = lookahead extends ">"
        ? unscanned extends `=${infer nextUnscanned}`
            ? nextUnscanned extends `=${string}`
                ? true
                : false
            : Scanner.skipWhitespace<unscanned> extends
                  | ""
                  | `${TerminatingChar}${string}`
            ? true
            : false
        : lookahead extends ","
        ? true
        : false

    export type shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`

    export type shiftUntil<
        unscanned extends string,
        terminator extends string,
        scanned extends string = ""
    > = unscanned extends shift<infer lookahead, infer nextUnscanned>
        ? lookahead extends terminator
            ? scanned extends `${infer base}${EscapeToken}`
                ? shiftUntil<nextUnscanned, terminator, `${base}${lookahead}`>
                : [scanned, unscanned]
            : shiftUntil<nextUnscanned, terminator, `${scanned}${lookahead}`>
        : [scanned, ""]

    export type shiftUntilNot<
        unscanned extends string,
        nonTerminator extends string,
        scanned extends string = ""
    > = unscanned extends shift<infer lookahead, infer nextUnscanned>
        ? lookahead extends nonTerminator
            ? shiftUntilNot<
                  nextUnscanned,
                  nonTerminator,
                  `${scanned}${lookahead}`
              >
            : [scanned, unscanned]
        : [scanned, ""]

    export type shiftUntilNextTerminator<unscanned extends string> = shiftUntil<
        unscanned,
        TerminatingChar
    >

    export type skipWhitespace<unscanned extends string> = shiftUntilNot<
        unscanned,
        WhiteSpaceToken
    >[1]

    export type shiftResult<
        scanned extends string,
        unscanned extends string
    > = [scanned, unscanned]
}
