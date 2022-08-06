import { Iterate, ListChars } from "@re-/tools"
import { Terminal } from "../index.js"
import { Bound } from "../nonTerminal/index.js"
import { EnclosedBaseStartChar, ErrorToken } from "./tokens.js"

export type Scan<Left extends string, Unscanned extends unknown[]> = [
    Left,
    ...Unscanned
]

export namespace Shift {
    export type ScannerFrom<Lookahead, Unscanned extends unknown[]> = {
        lookahead: Lookahead
        unscanned: Unscanned
    }

    // export type PushToken<
    //     Tokens extends string | [unknown, unknown],
    //     Lookahead
    // > = [Tokens, Lookahead]

    export type TypeScanner = {
        lookahead: unknown[]
        unscanned: unknown[]
    }

    type SingleCharOperator = "|" | "&" | ")"

    type BaseTermatingChar =
        | "?"
        | SingleCharOperator
        | "["
        | Bound.StartChar
        | " "

    type Z = Branch<ListChars<"string[][]|number[]">>

    export type Branch<Unscanned extends unknown[]> = Unscanned extends Iterate<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? ScannerFrom<"(", Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<Next, "", Rest>
            : Next extends " "
            ? Branch<Rest>
            : // @ts-ignore Figure out what to do with strings
              UnenclosedTokens<Next, Rest>
        : Error<`Expected an expression.`, []>

    export type UnenclosedTokens<
        Tokens extends string | [unknown, unknown],
        Unscanned extends unknown[]
    > = Unscanned extends Iterate<infer Next, infer Rest>
        ? Next extends "["
            ? List<Tokens, Rest>
            : Next extends "|"
            ? ScannerFrom<[Tokens, Next], Rest>
            : Next extends "&"
            ? ScannerFrom<[Tokens, Next], Rest>
            : Tokens extends string
            ? UnenclosedTokens<`${Tokens}${Next}`, Rest>
            : Error<`Unexpected operator '${Next}'`, Unscanned>
        : ScannerFrom<[Tokens, "END"], []>

    type List<
        Tokens extends string | [unknown, unknown],
        Unscanned extends unknown[]
    > = Unscanned extends Scan<"]", infer Rest>
        ? UnenclosedTokens<[Tokens, "[]"], Rest>
        : Error<`Missing expected ']'.`, Unscanned>

    type Bound<
        Start extends Bound.StartChar,
        Unscanned extends unknown[]
    > = Unscanned extends Iterate<infer Next, infer Rest>
        ? Next extends "="
            ? ScannerFrom<`${Start}=`, Rest>
            : Start extends "="
            ? Error<`= is not a valid comparator. Use == instead.`, Unscanned>
            : ScannerFrom<Start, Unscanned>
        : Error<`Expected a bound condition after ${Start}.`, []>

    type EnclosedBase<
        Enclosing extends EnclosedBaseStartChar,
        Contents extends string,
        Unscanned extends unknown[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends Enclosing
            ? // TODO: Avoid consecutive terminals
              UnenclosedTokens<`${Enclosing}${Contents}${Enclosing}`, Rest>
            : EnclosedBase<Enclosing, `${Contents}${Next}`, Rest>
        : Error<`${Contents} requires a closing ${Enclosing}.`, Unscanned>

    /* A recursive type that is used to scan a string of characters that are not enclosed in quotes. */
    // type UnenclosedBase<
    //     Fragment extends string,
    //     Unscanned extends unknown[]
    // > = Unscanned extends Scan<infer Next, infer Rest>
    //     ? Next extends BaseTermatingChar
    //         ? ScannerFrom<Terminal.UnenclosedToken<Fragment>, Unscanned>
    //         : UnenclosedBase<`${Fragment}${Next}`, Rest>
    //     : ScannerFrom<Terminal.UnenclosedToken<Fragment>, []>

    type Error<
        Message extends string,
        Unscanned extends unknown[]
    > = ScannerFrom<ErrorToken<Message>, Unscanned>
}
