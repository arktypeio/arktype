/// TODO: REmove
/* eslint-disable max-lines */
import { Bound, List } from "../nonTerminal/index.js"
import {
    BaseTerminatingChar,
    baseTerminatingChars,
    EnclosedBaseStartChar,
    enclosedBaseStartChars,
    ErrorToken,
    TrivialSingleCharOperator,
    trivialSingleCharOperators
} from "./tokens.js"

export namespace Lexer {
    export type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

    export type ScanDirection = "left" | "right"

    export type ScanInDirection<
        Next extends string,
        Unscanned extends string[],
        Direction extends ScanDirection
    > = Direction extends "left"
        ? ScanLeftward<Next, Unscanned>
        : Scan<Next, Unscanned>

    export type ScanLeftward<
        Right extends string,
        Unscanned extends string[]
    > = [...Unscanned, Right]

    export type ScannerFrom<R extends TypeScanner> = R

    export type TypeScanner = {
        lookahead: unknown
        unscanned: string[]
    }

    export class ValueScanner<Lookahead extends string = string> {
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
        ): this is ValueScanner<Token> {
            return this.lookahead === (token as string)
        }

        lookaheadIn<O>(o: O): this is ValueScanner<Extract<keyof O, string>> {
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

    export type ShiftSuffix<Unscanned extends string[]> =
        Unscanned extends ScanLeftward<infer Right, infer Rest>
            ? Right extends "?"
                ? ScannerFrom<{ lookahead: "?"; unscanned: Rest }>
                : ShiftPossibleBoundSuffix<Unscanned, "", Unscanned>
            : ScannerFrom<{ lookahead: ""; unscanned: Unscanned }>

    type ShiftPossibleBoundSuffix<
        OriginalUnscanned extends string[],
        Token extends string,
        Unscanned extends string[]
    > = Unscanned extends ScanLeftward<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar | EnclosedBaseStartChar
            ? Next extends Bound.StartChar
                ? ShiftBoundToken<Next, Rest, "left", Token>
                : ScannerFrom<{
                      lookahead: ""
                      unscanned: OriginalUnscanned
                  }>
            : ShiftPossibleBoundSuffix<
                  OriginalUnscanned,
                  `${Next}${Token}`,
                  Rest
              >
        : ScannerFrom<{
              lookahead: ""
              unscanned: OriginalUnscanned
          }>

    export type ShiftPrefix<Unscanned extends string[]> =
        ShiftPossibleBoundPrefix<ShiftBase<Unscanned>>

    type ShiftPossibleBoundPrefix<S extends TypeScanner> =
        S["unscanned"] extends Scan<infer Next, infer Rest>
            ? Next extends Bound.StartChar
                ? ShiftBoundToken<Next, Rest, "right", S["lookahead"]>
                : S
            : S

    export type ShiftBase<Unscanned extends string[]> = Unscanned extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? ScannerFrom<{ lookahead: Next; unscanned: Rest }>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<Next, Next, Rest>
            : Next extends " "
            ? ShiftBase<Rest>
            : UnenclosedBase<"", Unscanned>
        : ShiftError<[], `Expected an expression.`>

    export const shiftBase = (scanner: ValueScanner) => {
        scanner.lookahead = ""
        if (scanner.next === "(") {
            scanner.shift()
        } else if (scanner.next in enclosedBaseStartChars) {
            shiftEnclosedBase(scanner)
        } else if (scanner.next === " ") {
            scanner.skip()
            shiftBase(scanner)
        } else {
            shiftUnenclosedBase(scanner)
        }
    }

    const shiftUnenclosedBase = (scanner: ValueScanner) => {
        while (!(scanner.next in baseTerminatingChars)) {
            scanner.shift()
        }
    }

    type UnenclosedBase<
        Token extends string,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar
            ? ScannerFrom<{
                  lookahead: Token
                  unscanned: Unscanned
              }>
            : UnenclosedBase<`${Token}${Next}`, Rest>
        : ScannerFrom<{
              lookahead: Token
              unscanned: []
          }>

    const shiftEnclosedBase = (scanner: ValueScanner) => {
        do {
            scanner.shift()
            if (scanner.next === "END") {
                throw new Error(
                    `${scanner.lookahead} requires a closing ${scanner.lookahead[0]}.`
                )
            }
        } while (scanner.next !== scanner.lookahead[0])
        if (scanner.lookahead === "/") {
            throw new Error(`Regex literals cannot be empty.`)
        }
        scanner.shift()
    }

    type EnclosedBase<
        StartChar extends EnclosedBaseStartChar,
        Token extends string,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends StartChar
            ? Token extends "/"
                ? ShiftError<Unscanned, `Regex literals cannot be empty.`>
                : ScannerFrom<{
                      lookahead: `${Token}${Next}`
                      unscanned: Rest
                  }>
            : EnclosedBase<StartChar, `${Token}${Next}`, Rest>
        : ShiftError<Unscanned, `${Token} requires a closing ${StartChar}.`>

    export type ShiftOperator<Unscanned extends string[]> =
        Unscanned extends Scan<infer Next, infer Rest>
            ? Next extends TrivialSingleCharOperator
                ? ScannerFrom<{
                      lookahead: Next
                      unscanned: Rest
                  }>
                : Next extends "["
                ? ShiftListToken<Rest>
                : Next extends " "
                ? ShiftOperator<Rest>
                : ShiftError<Unscanned, `Expected an operator (got '${Next}').`>
            : ScannerFrom<{
                  lookahead: "END"
                  unscanned: []
              }>

    export type ShiftBoundToken<
        Start extends Bound.StartChar,
        Unscanned extends string[],
        Direction extends Lexer.ScanDirection,
        Value
    > = Unscanned extends Lexer.ScanInDirection<
        infer Next,
        infer NextUnscanned,
        Direction
    >
        ? Next extends "="
            ? Lexer.ScannerFrom<{
                  lookahead: Direction extends "right"
                      ? [Value, `${Start}=`]
                      : [`${Start}=`, Value]
                  unscanned: NextUnscanned
              }>
            : Start extends "="
            ? Lexer.ShiftError<
                  Unscanned,
                  `= is not a valid comparator. Use == instead.`
              >
            : Lexer.ScannerFrom<{
                  lookahead: Direction extends "right"
                      ? [Value, Start]
                      : [Start, Value]
                  unscanned: Unscanned
              }>
        : Lexer.ShiftError<
              [],
              `Expected a bound condition ${Direction extends "left"
                  ? "before"
                  : "after"} ${Start}.`
          >

    export type ShiftListToken<Unscanned extends string[]> =
        Unscanned extends Lexer.Scan<infer Next, infer Rest>
            ? Next extends "]"
                ? Lexer.ScannerFrom<{
                      lookahead: "[]"
                      unscanned: Rest
                  }>
                : Lexer.ShiftError<Unscanned, `Missing expected ']'.`>
            : Lexer.ShiftError<[], `Missing expected ']'.`>

    export const shiftOperator = (scanner: ValueScanner) => {
        scanner.lookahead = ""
        scanner.shift()
        if (scanner.lookahead in trivialSingleCharOperators) {
            scanner
        } else if (scanner.lookaheadIs("[")) {
            List.shiftToken(scanner)
        } else if (scanner.lookaheadIn(Bound.startChars)) {
            Bound.shiftToken(scanner)
        } else if (scanner.lookahead === " ") {
            shiftOperator(scanner)
        } else {
            throw new Error(
                `Expected an operator (got '${scanner.lookahead}').`
            )
        }
    }

    export type ShiftError<
        Unscanned extends string[],
        Message extends string
    > = ScannerFrom<{
        lookahead: ErrorToken<Message>
        unscanned: Unscanned
    }>
}
