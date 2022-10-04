import type { KeySet } from "@re-/tools"
import { keySet } from "@re-/tools"

export class scanner<Lookahead extends string = string> {
    private chars: string[]
    private i: number
    hasBeenFinalized = false

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

    export const expressionExpectedMessage = <Unscanned extends string>(
        unscanned: Unscanned
    ) =>
        `Expected an expression${
            unscanned ? ` before '${unscanned}'` : ""
        }.` as Scanner.ExpressionExpectedMessage<Unscanned>
}

export namespace Scanner {
    export type shift<
        Lookahead extends string,
        Unscanned extends string
    > = `${Lookahead}${Unscanned}`

    export type TailOf<S> = S extends `${string}${infer Tail}` ? Tail : ""

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

    export type TerminatingChar = keyof typeof scanner.terminatingChars

    export type ExpressionExpectedMessage<Unscanned extends string> =
        `Expected an expression${Unscanned extends ""
            ? ""
            : ` before '${Unscanned}'`}.`
}
