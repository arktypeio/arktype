import { Bound, List } from "../nonTerminal/index.js"
import { ParserState } from "./state.js"

export const literalEnclosingChars = {
    "'": 1,
    '"': 1,
    "/": 1
}

type LiteralEnclosingChar = keyof typeof literalEnclosingChars

const baseTerminatingChars = {
    END: 1,
    "?": 1,
    "<": 1,
    ">": 1,
    "=": 1,
    "|": 1,
    "&": 1,
    "(": 1,
    ")": 1,
    "[": 1,
    " ": 1
}

// TODO move token lists somewhere central to avoid redundancy.
export const suffixTokens = {
    "<": 1,
    ">": 1,
    ">=": 1,
    "<=": 1,
    "==": 1,
    END: 1,
    "?": 1
}

export type ErrorToken<Message extends string> = `!${Message}`

// Right now, ErrorTokens only exist within the type parser since at runtime it would just throw directly
export type SuffixToken = keyof typeof suffixTokens | ErrorToken<string>

type BaseTerminatingChar = keyof typeof baseTerminatingChars

// The operator tokens that are exactly one character and are not the first character of a longer token
const trivialSingleCharOperators = {
    "|": 1,
    "&": 1,
    "?": 1,
    ")": 1,
    END: 1
}

export type TokenSet = Record<string, number>

type TrivialSingleCharOperator = keyof typeof trivialSingleCharOperators

export namespace Lexer {
    export type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

    export class Scanner<Lookahead extends string = string> {
        private chars: string[]
        private i: number
        lookahead: Lookahead

        constructor(def: string) {
            this.chars = [...def, "END"]
            this.i = 0
            this.lookahead = "" as any
        }

        lookaheadIs<Token extends string>(
            token: Token
        ): this is Scanner<Token> {
            return this.lookahead === (token as string)
        }

        lookaheadIsIn<O>(o: O): this is Scanner<Extract<keyof O, string>> {
            return this.lookahead in o
        }

        shift() {
            // @ts-ignore
            this.lookahead += this.chars[this.i]
            this.i++
        }

        skip() {
            this.i++
        }

        get next() {
            return this.chars[this.i]
        }
    }

    export type ShiftBase<Unscanned extends string[]> = Unscanned extends Scan<
        infer Lookahead,
        infer Rest
    >
        ? Lookahead extends "("
            ? ParserState.RightFrom<{ lookahead: Lookahead; unscanned: Rest }>
            : Lookahead extends LiteralEnclosingChar
            ? EnclosedBase<Lookahead, Lookahead, Rest>
            : Lookahead extends " "
            ? ShiftBase<Rest>
            : UnenclosedBase<"", Unscanned>
        : ParserState.RightFrom<{
              lookahead: ErrorToken<`Expected an expression.`>
              unscanned: []
          }>

    export const shiftBase = (scanner: Scanner) => {
        scanner.lookahead = ""
        if (scanner.next === "(") {
            scanner.shift()
        } else if (scanner.next in literalEnclosingChars) {
            shiftEnclosedBase(scanner)
        } else if (scanner.next === " ") {
            scanner.skip()
            shiftBase(scanner)
        } else {
            shiftUnenclosedBase(scanner)
        }
    }

    const shiftUnenclosedBase = (scanner: Scanner) => {
        while (!(scanner.next in baseTerminatingChars)) {
            scanner.shift()
        }
    }

    type UnenclosedBase<
        Token extends string,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Lookahead, infer Rest>
        ? Lookahead extends BaseTerminatingChar
            ? ParserState.RightFrom<{
                  lookahead: Token
                  unscanned: Unscanned
              }>
            : UnenclosedBase<`${Token}${Lookahead}`, Rest>
        : ParserState.RightFrom<{
              lookahead: Token
              unscanned: []
          }>

    const shiftEnclosedBase = (scanner: Scanner) => {
        do {
            scanner.shift()
            if (scanner.next === "END") {
                throw new Error(
                    `${scanner.lookahead} requires a closing ${scanner.lookahead[0]}.`
                )
            }
        } while (scanner.next !== scanner.lookahead[0])
        scanner.shift()
    }

    type EnclosedBase<
        StartChar extends LiteralEnclosingChar,
        Token extends string,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Lookahead, infer Rest>
        ? Lookahead extends StartChar
            ? ParserState.RightFrom<{
                  lookahead: `${Token}${Lookahead}`
                  unscanned: Rest
              }>
            : EnclosedBase<StartChar, `${Token}${Lookahead}`, Rest>
        : ShiftError<`${Token} requires a closing ${StartChar}.`>

    export type ShiftOperator<Unscanned extends string[]> =
        Unscanned extends Scan<infer Lookahead, infer Rest>
            ? Lookahead extends TrivialSingleCharOperator
                ? ParserState.RightFrom<{
                      lookahead: Lookahead
                      unscanned: Rest
                  }>
                : Lookahead extends "["
                ? List.ShiftToken<Rest>
                : Lookahead extends Bound.StartChar
                ? Bound.ShiftToken<Lookahead, Rest>
                : Lookahead extends " "
                ? ShiftOperator<Rest>
                : ParserState.RightFrom<{
                      lookahead: ErrorToken<`Expected an operator (got '${Lookahead}').`>
                      unscanned: []
                  }>
            : ParserState.RightFrom<{
                  lookahead: "END"
                  unscanned: []
              }>

    export const shiftOperator = (scanner: Scanner) => {
        scanner.lookahead = ""
        scanner.shift()
        if (scanner.lookahead in trivialSingleCharOperators) {
            scanner
        } else if (scanner.lookaheadIs("[")) {
            List.shiftToken(scanner)
        } else if (scanner.lookaheadIsIn(Bound.startChars)) {
            Bound.shiftToken(scanner)
        } else if (scanner.lookahead === " ") {
            shiftOperator(scanner)
        } else {
            throw new Error(
                `Expected an operator (got '${scanner.lookahead}').`
            )
        }
    }

    export type ShiftError<Message extends string> = ParserState.RightFrom<{
        lookahead: ErrorToken<Message>
        unscanned: []
    }>
}
