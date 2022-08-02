import { ListChars } from "@re-/tools"
import { State } from "./str.js"
import {
    BigintLiteralDefinition,
    Keyword,
    NumberLiteralDefinition
} from "./terminal/index.js"

export type Right = {
    lookahead: string
    unscanned: string[]
}

export type Right2 = {
    token: string
    lookahead: string
    unscanned: string[]
}

type Right2From<R extends Right2> = R

type Scan<Left extends string, Unscanned extends string[]> = [
    Left,
    ...Unscanned
]

type RightFrom<R extends Right> = R

export type InitializeRight<Def extends string> = RightFrom<{
    lookahead: ""
    unscanned: ListChars<Def>
}>

type IsResolvableName<Def, Dict> = Def extends Keyword.Definition
    ? true
    : Def extends keyof Dict
    ? true
    : false

export namespace Shift {
    export type Base<Unscanned extends string[], Dict> = Unscanned extends Scan<
        infer Lookahead,
        infer Rest
    >
        ? Lookahead extends "("
            ? RightFrom<{ lookahead: "("; unscanned: Rest }>
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

    type ValidateUnenclosedBase<Token extends string, Dict> = IsResolvableName<
        Token,
        Dict
    > extends true
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
        ? Lookahead extends "["
            ? ListToken<Rest>
            : Lookahead extends ComparatorStartChar
            ? ComparatorToken<Lookahead, Rest>
            : Lookahead extends " "
            ? Operator<Rest>
            : RightFrom<{
                  lookahead: Lookahead
                  unscanned: Rest
              }>
        : RightFrom<{
              lookahead: "END"
              unscanned: []
          }>

    type ComparatorToken<
        StartChar extends ComparatorStartChar,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Lookahead, infer Rest>
        ? Lookahead extends "="
            ? RightFrom<{
                  lookahead: `${StartChar}=`
                  unscanned: Rest
              }>
            : StartChar extends "="
            ? Error<`= is not a valid comparator. Use == instead.`>
            : RightFrom<{
                  lookahead: StartChar
                  unscanned: Unscanned
              }>
        : Error<`Expected a bound condition after ${StartChar}.`>

    type ListToken<Unscanned extends string[]> = Unscanned extends Scan<
        infer Lookahead,
        infer Rest
    >
        ? Lookahead extends "]"
            ? RightFrom<{
                  lookahead: "[]"
                  unscanned: Rest
              }>
            : Error<`Missing expected ']'.`>
        : Error<`Missing expected ']'.`>

    export type Error<Message extends string> = RightFrom<{
        lookahead: ErrorToken<Message>
        unscanned: []
    }>
}

type ComparatorStartChar = "<" | ">" | "="

type BaseTerminatingChar =
    | ModifyingOperatorStartChar
    | BranchTerminatingChar
    | " "

type BranchTerminatingChar = BranchingOperatorToken | ")" | SuffixToken | "="

type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="
type SuffixToken = "END" | "?" | ComparatorToken

type BranchingOperatorToken = "|" | "&"

type ModifyingOperatorStartChar = "["

type LiteralEnclosingChar = `'` | `"` | `/`

type ErrorToken<Message extends string> = `!${Message}`
