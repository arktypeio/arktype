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

    export type ReverseScan<
        Right extends string,
        Unscanned extends string[]
    > = [...Unscanned, Right]

    export type ScannerFrom<R extends TypeScanner> = R

    export type TypeScanner = {
        lookahead: string
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
        Unscanned extends ReverseScan<infer Right, infer Rest>
            ? Right extends "?"
                ? ScannerFrom<{ lookahead: "?"; unscanned: Rest }>
                : ShiftPossibleBoundSuffix<Unscanned, "", Unscanned>
            : ScannerFrom<{ lookahead: ""; unscanned: Unscanned }>

    // TODO: Clarify lookahead names for chars/tokens
    type ShiftPossibleBoundSuffix<
        OriginalUnscanned extends string[],
        Token extends string,
        Unscanned extends string[]
    > = Unscanned extends ReverseScan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar | EnclosedBaseStartChar
            ? Next extends Bound.StartChar
                ? ScannerFrom<{
                      lookahead: `${Next}${Token}`
                      unscanned: Rest
                  }>
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
        S["unscanned"] extends Scan<infer Lookahead, infer Rest>
            ? Lookahead extends Bound.StartChar
                ? ScannerFrom<{
                      lookahead: `${S["lookahead"]}${Lookahead}`
                      unscanned: Rest
                  }>
                : S
            : S

    export type ShiftBase<Unscanned extends string[]> = Unscanned extends Scan<
        infer Lookahead,
        infer Rest
    >
        ? Lookahead extends "("
            ? ScannerFrom<{ lookahead: Lookahead; unscanned: Rest }>
            : Lookahead extends EnclosedBaseStartChar
            ? EnclosedBase<Lookahead, Lookahead, Rest>
            : Lookahead extends " "
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
    > = Unscanned extends Scan<infer Lookahead, infer Rest>
        ? Lookahead extends BaseTerminatingChar
            ? ScannerFrom<{
                  lookahead: Token
                  unscanned: Unscanned
              }>
            : UnenclosedBase<`${Token}${Lookahead}`, Rest>
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
    > = Unscanned extends Scan<infer Lookahead, infer Rest>
        ? Lookahead extends StartChar
            ? Token extends "/"
                ? ShiftError<Unscanned, `Regex literals cannot be empty.`>
                : ScannerFrom<{
                      lookahead: `${Token}${Lookahead}`
                      unscanned: Rest
                  }>
            : EnclosedBase<StartChar, `${Token}${Lookahead}`, Rest>
        : ShiftError<Unscanned, `${Token} requires a closing ${StartChar}.`>

    export type ShiftOperator<Unscanned extends string[]> =
        Unscanned extends Scan<infer Lookahead, infer Rest>
            ? Lookahead extends TrivialSingleCharOperator
                ? ScannerFrom<{
                      lookahead: Lookahead
                      unscanned: Rest
                  }>
                : Lookahead extends "["
                ? List.ShiftToken<Rest>
                : // : Lookahead extends Bound.StartChar
                // ? Bound.ShiftToken<Lookahead, Rest>
                Lookahead extends " "
                ? ShiftOperator<Rest>
                : ShiftError<
                      Unscanned,
                      `Expected an operator (got '${Lookahead}').`
                  >
            : ScannerFrom<{
                  lookahead: "END"
                  unscanned: []
              }>

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
