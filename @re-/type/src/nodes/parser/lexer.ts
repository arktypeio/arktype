import { Branches } from "../nonTerminal/branch/branch.js"
import { Bounds, List } from "../nonTerminal/index.js"
import { ParseError } from "./shared.js"
import { ParserState } from "./state.js"

export namespace Lexer {
    export type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

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

    export type ShiftError<Message extends string> = ParserState.RightFrom<{
        lookahead: ParseError<Message>
        unscanned: []
    }>

    type BaseTerminatingChar = "[" | BranchTerminatingChar | " "

    // The operator tokens that are exactly one character and are not the first character of a longer token
    type TrivialSingleCharOperator = Branches.Token | "?" | ")"

    type BranchTerminatingChar = Branches.Token | ")" | SuffixStartChar

    type SuffixStartChar = "?" | Bounds.StartChar

    type LiteralEnclosingChar = `'` | `"` | `/`
}
