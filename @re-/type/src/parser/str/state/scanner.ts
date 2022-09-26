import type { KeySet } from "@re-/tools"
import { keySet } from "@re-/tools"

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

    // TODO: Can these be moved to Bounds somehow?
    export const comparators = keySet({
        "<": 1,
        ">": 1,
        "<=": 1,
        ">=": 1,
        "==": 1
    })

    export const suffixes = keySet({
        END: 1,
        "?": 1
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

    export type Comparator = keyof typeof scanner.comparators

    export type Suffix = keyof typeof scanner.suffixes

    export type OneCharSuffix = "?" | "%" | "<" | ">" | "END"

    export type TwoCharSuffix = "<=" | ">=" | "=="
}

export type InvalidSuffixMessage<
    LastValidSuffixToken extends Scanner.Suffix,
    Unscanned extends string,
    ExpectedFollowingTokenDescription extends string = ""
> = `Suffix ${LastValidSuffixToken} must be followed by${ExpectedFollowingTokenDescription extends ""
    ? ""
    : ` ${ExpectedFollowingTokenDescription} and`} zero or more additional suffix tokens (got '${Unscanned}').`

export const invalidSuffixMessage = <
    Token extends Scanner.Suffix,
    Unscanned extends string,
    ExpectedFollowingTokenDescription extends string
>(
    lastValidSuffixToken: Token,
    unscanned: Unscanned,
    expectedFollowingTokenDescription?: ExpectedFollowingTokenDescription
): InvalidSuffixMessage<Token, Unscanned, ExpectedFollowingTokenDescription> =>
    `Suffix ${lastValidSuffixToken} must be followed by${
        (expectedFollowingTokenDescription
            ? ` ${expectedFollowingTokenDescription} and`
            : "") as any
    } zero or more additional suffix tokens (got '${unscanned}').`
