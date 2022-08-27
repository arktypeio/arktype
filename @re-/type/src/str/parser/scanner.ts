import { Evaluate, Narrow } from "@re-/tools"

export type TokenSet = Record<string, 1>

export const tokenSet = <T extends TokenSet>(tokenSet: Narrow<T>) =>
    tokenSet as Evaluate<T>

export const inTokenSet = <Set extends TokenSet>(
    token: string,
    set: Set
): token is Extract<keyof Set, string> => token in set

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
        let shifted = ""
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

    lookaheadIs<Char extends Lookahead>(char: Char): this is scanner<Char> {
        return this.lookahead === char
    }

    lookaheadIsIn<Tokens extends TokenSet>(
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
    }
}

export namespace Scanner {
    export type Shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`
}
