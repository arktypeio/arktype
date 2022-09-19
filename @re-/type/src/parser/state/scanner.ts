import { Evaluate, Narrow } from "@re-/tools"

export class scanner<Lookahead extends string = string> {
    private chars: string[]
    private i: number

    constructor(def: string) {
        this.chars = [...def]
        this.i = 0
    }

    shift() {
        // The value of i++ in this context is i's original value,
        // so the returned char will be the same as lookahead
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

    lookaheadIsIn<Tokens extends scanner.tokenSet>(
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

    export type tokenSet = Record<string, 1>

    export const tokens = <T extends tokenSet>(tokenSet: Narrow<T>) =>
        tokenSet as Evaluate<T>

    export const inTokenSet = <Set extends tokenSet>(
        token: string,
        set: Set
    ): token is Extract<keyof Set, string> => token in set

    // TODO: Can these be moved to Bounds somehow?
    export const comparators = tokens({
        "<": 1,
        ">": 1,
        "<=": 1,
        ">=": 1,
        "==": 1
    })

    export const suffixes = scanner.tokens({
        ...comparators,
        END: 1,
        "?": 1
    })
}

export namespace Scanner {
    export type Shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`

    export type Comparator = keyof typeof scanner.comparators

    export type Suffix = keyof typeof scanner.suffixes
}
