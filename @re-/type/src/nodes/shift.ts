import { ListChars } from "@re-/tools"
import { Branches } from "./nonTerminal/branch/branch.js"
import { Bounds, List } from "./nonTerminal/index.js"
import { Str } from "./str.js"
import {
    BigintLiteralDefinition,
    NumberLiteralDefinition
} from "./terminal/index.js"

export namespace Shift {
    export type Scan<Left extends string, Unscanned extends string[]> = [
        Left,
        ...Unscanned
    ]

    export type Right = {
        lookahead: string
        unscanned: string[]
    }

    export type RightFrom<R extends Right> = R

    export type InitializeRight<Def extends string> = RightFrom<{
        lookahead: ""
        unscanned: ListChars<Def>
    }>

    export type Base<Unscanned extends string[], Dict> = Unscanned extends Scan<
        infer Lookahead,
        infer Rest
    >
        ? Lookahead extends "("
            ? RightFrom<{ lookahead: Lookahead; unscanned: Rest }>
            : Lookahead extends LiteralEnclosingChar
            ? EnclosedBase<Lookahead, Lookahead, Rest>
            : Lookahead extends " "
            ? Base<Rest, Dict>
            : UnenclosedBase<"", Unscanned, Dict>
        : RightFrom<{
              lookahead: ErrorToken<`Expected an expression.`>
              unscanned: []
          }>

    type UnenclosedBase<
        Token extends string,
        Unscanned extends string[],
        Dict
    > = Unscanned extends Scan<infer Lookahead, infer Rest>
        ? Lookahead extends BaseTerminatingChar
            ? RightFrom<{
                  lookahead: ValidateUnenclosedBase<Token, Dict>
                  unscanned: Unscanned
              }>
            : UnenclosedBase<`${Token}${Lookahead}`, Rest, Dict>
        : RightFrom<{
              lookahead: ValidateUnenclosedBase<Token, Dict>
              unscanned: []
          }>

    type ValidateUnenclosedBase<
        Token extends string,
        Dict
    > = Str.IsResolvableName<Token, Dict> extends true
        ? Token
        : Token extends NumberLiteralDefinition | BigintLiteralDefinition
        ? Token
        : Token extends ""
        ? ErrorToken<`Expected an expression.`>
        : ErrorToken<`'${Token}' does not exist in your space.`>

    type EnclosedBase<
        StartChar extends LiteralEnclosingChar,
        Token extends string,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Lookahead, infer Rest>
        ? Lookahead extends StartChar
            ? RightFrom<{
                  lookahead: ValidateEnclosedBase<`${Token}${Lookahead}`>
                  unscanned: Rest
              }>
            : EnclosedBase<StartChar, `${Token}${Lookahead}`, Rest>
        : Error<`${Token} requires a closing ${StartChar}.`>

    type ValidateEnclosedBase<Token extends string> = Token extends "//"
        ? ErrorToken<`Regex literals cannot be empty.`>
        : Token

    export type Operator<Unscanned extends string[]> = Unscanned extends Scan<
        infer Lookahead,
        infer Rest
    >
        ? Lookahead extends TrivialSingleCharOperator
            ? RightFrom<{
                  lookahead: Lookahead
                  unscanned: Rest
              }>
            : Lookahead extends "["
            ? List.T.ShiftToken<Rest>
            : Lookahead extends Bounds.T.StartChar
            ? Bounds.T.ShiftToken<Lookahead, Rest>
            : Lookahead extends " "
            ? Operator<Rest>
            : RightFrom<{
                  lookahead: ErrorToken<`Expected an operator (got '${Lookahead}').`>
                  unscanned: []
              }>
        : RightFrom<{
              lookahead: "END"
              unscanned: []
          }>

    export type Error<Message extends string> = RightFrom<{
        lookahead: ErrorToken<Message>
        unscanned: []
    }>

    type BaseTerminatingChar = "[" | BranchTerminatingChar | " "

    // The operator tokens that are exactly one character and are not the first character of a longer token
    type TrivialSingleCharOperator = Branches.Token | "?" | ")"

    type BranchTerminatingChar = Branches.Token | ")" | SuffixStartChar

    type SuffixStartChar = "?" | Bounds.T.StartChar

    type LiteralEnclosingChar = `'` | `"` | `/`

    type ErrorToken<Message extends string> = `!${Message}`
}
