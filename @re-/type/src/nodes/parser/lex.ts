import { ListChars } from "@re-/tools"
import { Bound } from "../nonTerminal/index.js"
import { EnclosedBaseStartChar } from "./tokens.js"

export type Scan<Left extends string, Unscanned extends string[]> = [
    Left,
    ...Unscanned
]

export namespace Lex {
    export type ScannerFrom<R extends TypeScanner> = R

    export type TypeScanner = {
        lookahead: unknown
        unscanned: string[]
    }

    export type Definition<Def extends string> = Token<[], ListChars<Def>>

    type SingleCharToken = "|" | "&" | "?" | "(" | ")"

    type BaseTermatingChar = SingleCharToken | "[" | Bound.StartChar | " "

    type Token<
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends SingleCharToken
            ? Token<[...Tokens, Next], Rest>
            : Next extends "["
            ? List<Tokens, Rest>
            : Next extends Bound.StartChar
            ? Bound<Tokens, Next, Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<Tokens, Next, "", Rest>
            : Next extends " "
            ? Token<Tokens, Rest>
            : UnenclosedBase<Tokens, Next, Rest>
        : Tokens

    type Bound<
        Tokens extends string[],
        Start extends Bound.StartChar,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends "="
            ? Token<[...Tokens, `${Start}=`], Rest>
            : Start extends "="
            ? [`= is not a valid comparator. Use == instead.`]
            : Token<[...Tokens, Start], Unscanned>
        : [`Expected a bound condition after ${Start}.`]

    type List<
        Tokens extends string[],
        Unscanned extends string[]
    > = Unscanned extends Scan<"]", infer Rest>
        ? Token<[...Tokens, "[]"], Rest>
        : [`Missing expected ']'.`]

    type EnclosedBase<
        Tokens extends string[],
        Enclosing extends EnclosedBaseStartChar,
        Contents extends string,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends Enclosing
            ? Token<[...Tokens, `${Enclosing}${Contents}${Enclosing}`], Rest>
            : EnclosedBase<Tokens, Enclosing, `${Contents}${Next}`, Rest>
        : [`${Contents} requires a closing ${Enclosing}.`]

    type UnenclosedBase<
        Tokens extends string[],
        Fragment extends string,
        Unscanned extends string[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTermatingChar
            ? Token<[...Tokens, Fragment], Unscanned>
            : UnenclosedBase<Tokens, `${Fragment}${Next}`, Rest>
        : [...Tokens, Fragment]
}
