import { Terminal } from "../index.js"
import { Bound, Branches } from "../nonTerminal/index.js"
import { EnclosedBaseStartChar, ErrorToken } from "./tokens.js"

export type Scan<
    First extends string,
    Unscanned extends string
> = `${First}${Unscanned}`

export namespace Shift2 {
    export type ScannerFrom<
        Lookahead extends string[],
        Unscanned extends string
    > = {
        lookahead: Lookahead
        unscanned: Unscanned
    }

    export type TypeScanner = {
        lookahead: string[]
        unscanned: string
    }

    type SingleCharOperator = "|" | "&" | ")" | "?"

    type BaseTerminatingChar = SingleCharOperator | "[" | Bound.Char | " "

    export type Branch<Unscanned extends string> = Unscanned extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? ScannerFrom<["("], Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<Next, Rest>
            : Next extends " "
            ? Branch<Rest>
            : UnenclosedBase<Next, Rest>
        : Error<`Expected an expression.`, "">

    export type Operators<
        Tokens extends string[],
        Unscanned extends string
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends "?"
            ? Rest extends ""
                ? ScannerFrom<[...Tokens, "?"], "">
                : Error<
                      `Suffix '?' is only valid at the end of a definition.`,
                      Unscanned
                  >
            : Next extends "["
            ? Rest extends Scan<"]", infer Following>
                ? Operators<[...Tokens, "[]"], Following>
                : Error<`Missing expected ']'.`, Unscanned>
            : Next extends Branches.Token
            ? ScannerFrom<[...Tokens, Next], Rest>
            : Next extends " "
            ? Operators<Tokens, Rest>
            : Error<`Unexpected operator '${Next}'`, Unscanned>
        : ScannerFrom<Tokens, "">

    type EnclosedBase<
        Enclosing extends EnclosedBaseStartChar,
        Unscanned extends string
    > = Unscanned extends `${infer Contents}${Enclosing}${infer Rest}`
        ? Operators<[`${Enclosing}${Contents}${Enclosing}`], Rest>
        : Error<`${Unscanned} requires a closing ${Enclosing}.`, "">

    // type Bound<
    //     Start extends Bound.Char,
    //     Unscanned extends string
    // > = Unscanned extends Scan<infer Next, infer Rest>
    //     ? Next extends "="
    //         ? ScannerFrom<`${Start}=`, Rest>
    //         : Start extends "="
    //         ? Error<`= is not a valid comparator. Use == instead.`, Unscanned>
    //         : ScannerFrom<Start, Unscanned>
    //     : Error<`Expected a bound condition after ${Start}.`, Unscanned>

    type UnenclosedBase<
        Fragment extends string,
        Unscanned extends string
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar
            ? Operators<[Fragment], Unscanned>
            : UnenclosedBase<`${Fragment}${Next}`, Rest>
        : ScannerFrom<[Fragment], "">

    type Error<Message extends string, Unscanned extends string> = ScannerFrom<
        [ErrorToken<Message>],
        Unscanned
    >
}
