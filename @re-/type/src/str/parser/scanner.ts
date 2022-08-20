import { TokenSet } from "./tokens.js"

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

    shiftUntil(condition: UntilCondition, opts?: ShiftUntilOptions) {
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

export namespace Scanner {
    export type Shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`
}

export type UntilCondition = (scanner: scanner, shifted: string) => boolean

export type OnInputEndFn = (scanner: scanner, shifted: string) => string

export type ShiftUntilOptions = {
    onInputEnd?: OnInputEndFn
    inclusive?: boolean
}
