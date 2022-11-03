import type { dictionary } from "../../internal.js"

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

    lookaheadIsIn<Tokens extends dictionary>(
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

    export const comparatorStartChars = {
        "<": true,
        ">": true,
        "=": true
    } as const

    export const terminatingChars = {
        ...comparatorStartChars,
        "|": true,
        "&": true,
        ")": true,
        "[": true,
        "%": true,
        " ": true
    } as const

    export type TerminatingChar = keyof typeof Scanner.terminatingChars

    export const comparators = {
        "<": true,
        ">": true,
        "<=": true,
        ">=": true,
        "==": true
    } as const

    export type Comparator = keyof typeof comparators

    export const pairableComparators = {
        "<": true,
        "<=": true
    } as const

    export type PairableComparator = keyof typeof pairableComparators

    export type ComparatorStartChar = keyof typeof comparatorStartChars

    export const oneCharComparators = {
        "<": true,
        ">": true
    } as const

    export type OneCharComparator = keyof typeof oneCharComparators

    export const naryTokens = {
        "|": true,
        "&": true
    } as const

    export type NaryToken = keyof typeof naryTokens

    export const binaryTokens = {
        ...comparators,
        "%": true
    } as const

    export type BinaryToken = keyof typeof binaryTokens

    export const infixTokens = {
        ...naryTokens,
        ...binaryTokens
    } as const

    export type InfixToken = keyof typeof infixTokens

    export const unaryTokens = {
        "[]": true
    } as const

    export type UnaryToken = keyof typeof unaryTokens

    export const operatorTokens = {
        ...infixTokens,
        ...unaryTokens
    } as const

    export type OperatorToken = keyof typeof operatorTokens

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
