import { Branches } from "../nonTerminal/branch/branch.js"
import { Bounds, List } from "../nonTerminal/index.js"
import { ParseError } from "./shared.js"
import { ParserState } from "./state.js"

const literalEnclosingChars = {
    "'": 1,
    '"': 1,
    "/": 1
}

type LiteralEnclosingChar = keyof typeof literalEnclosingChars

const boundStartingChars = {
    "<": 1,
    ">": 1,
    "=": 1
}

type BoundStartingChar = keyof typeof boundStartingChars

const suffixStartingChars = {
    ...boundStartingChars,
    "?": 1,
    END: 1
}

type SuffixStartingChar = keyof typeof suffixStartingChars

const branchTerminating = {
    ...suffixStartingChars,
    ...Branches.tokens,
    ")": 1
}

type BranchTerminatingChar = keyof typeof branchTerminating

const baseTerminatingChars = {
    ...branchTerminating,
    "[": 1,
    " ": 1
}

type BaseTerminatingChar = keyof typeof baseTerminatingChars

// The operator tokens that are exactly one character and are not the first character of a longer token
const trivialSingleCharOperators = {
    ...Branches.tokens,
    "?": 1,
    ")": 1,
    END: 1
}

type TrivialSingleCharOperator = keyof typeof trivialSingleCharOperators

export namespace Lexer {
    export type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

    export class Scanner {
        chars: string[]
        i: number
        lookahead: string

        constructor(def: string) {
            this.chars = [...def, "END"]
            this.i = 0
            this.lookahead = ""
        }

        shiftChar() {
            this.lookahead += this.char
            this.i++
        }

        get char() {
            return this.chars[this.i]
        }

        get nextChar() {
            return this.chars[this.i + 1]
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
              lookahead: ParseError<`Expected an expression.`>
              unscanned: []
          }>

    export const shiftBase = (scanner: Scanner) => {
        scanner.lookahead = ""
        if (scanner.char === "(") {
            scanner.shiftChar()
        } else if (scanner.char in literalEnclosingChars) {
            shiftEnclosedBase(scanner)
        } else if (scanner.char === " ") {
            scanner.i++
            shiftBase(scanner)
        } else {
            shiftUnenclosedBase(scanner)
        }
    }

    const shiftUnenclosedBase = (scanner: Scanner) => {
        while (!(scanner.char in baseTerminatingChars)) {
            scanner.shiftChar()
        }
        return scanner
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
            scanner.shiftChar()
            if (scanner.char === "END") {
                throw new Error(
                    `${scanner.lookahead} requires a closing ${scanner.lookahead[0]}.`
                )
            }
        } while (scanner.char !== scanner.lookahead[0])
        scanner.shiftChar()
        return scanner
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
                : Lookahead extends Bounds.StartChar
                ? Bounds.ShiftToken<Lookahead, Rest>
                : Lookahead extends " "
                ? ShiftOperator<Rest>
                : ParserState.RightFrom<{
                      lookahead: ParseError<`Expected an operator (got '${Lookahead}').`>
                      unscanned: []
                  }>
            : ParserState.RightFrom<{
                  lookahead: "END"
                  unscanned: []
              }>

    export const shiftOperator = (scanner: Scanner) => {
        scanner.shiftChar()
        const char = scanner.char
        if (char in trivialSingleCharOperators) {
            return scanner
        }
    }

    export type ShiftError<Message extends string> = ParserState.RightFrom<{
        lookahead: ParseError<Message>
        unscanned: []
    }>
}
