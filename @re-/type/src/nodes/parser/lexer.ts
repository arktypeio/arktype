import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound, List } from "../nonTerminal/index.js"
import { ParseError } from "./shared.js"
import { ParserState } from "./state.js"

export const literalEnclosingChars = {
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
        private chars: string[]
        private i: number
        lookahead: string

        constructor(def: string) {
            this.chars = [...def, "END"]
            this.i = 0
            this.lookahead = ""
        }

        shift() {
            this.lookahead += this.next
            this.i++
        }

        skip() {
            this.i++
        }

        get next() {
            return this.chars[this.i]
        }

        unscanned(i: number) {
            return this.chars[this.i + i]
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
        return scanner
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
                      lookahead: ParseError<`Expected an operator (got '${Lookahead}').`>
                      unscanned: []
                  }>
            : ParserState.RightFrom<{
                  lookahead: "END"
                  unscanned: []
              }>

    export const shiftOperator = (scanner: Scanner): Scanner => {
        scanner.shift()
        const char = scanner.next
        if (char in trivialSingleCharOperators) {
            return scanner
        }
        if (char === "[") {
            return List.shiftToken(scanner)
        }
        if (char in boundStartingChars) {
            return Bound.shiftToken(scanner)
        }
        if (char === " ") {
            return shiftOperator(scanner)
        }
        throw new Error(`Expected an operator (got '${char}').`)
    }

    export type ShiftError<Message extends string> = ParserState.RightFrom<{
        lookahead: ParseError<Message>
        unscanned: []
    }>
}
