import { Iterate, ListChars } from "@re-/tools"
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

    export type TypeScanner = {
        lookahead: unknown
        unscanned: unknown[]
    }

    type SingleCharToken = "|" | "&" | "(" | ")"

    type SingleCharOperator = "|" | "&" | ")"

    type BaseTermatingChar = "?" | SingleCharToken | "[" | Bound.StartChar | " "

    export type Token<Unscanned extends unknown[]> = Unscanned extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "?"
            ? ScannerFrom<
                  Rest extends []
                      ? "?"
                      : ErrorToken<`Suffix '?' is only valid at the end of a definition.`>,
                  Rest
              >
            : Next extends SingleCharToken
            ? ScannerFrom<Next, Rest>
            : Next extends "["
            ? List<Rest>
            : Next extends Bound.StartChar
            ? Bound<Next, Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<Next, "", Rest>
            : Next extends " "
            ? Token<Rest>
            : UnenclosedBase<Next, Rest>
        : ScannerFrom<"END", []>

    export type Base<Unscanned extends unknown[]> = Unscanned extends Iterate<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? ScannerFrom<"(", Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<Next, "", Rest>
            : Next extends " "
            ? Base<Rest>
            : UnenclosedBase<Next & string, Rest>
        : Error<`Expected an expression.`, []>

    export type Operator<Unscanned extends unknown[]> = Unscanned extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "?"
            ? ScannerFrom<
                  Rest extends []
                      ? "?"
                      : ErrorToken<`Suffix '?' is only valid at the end of a definition.`>,
                  Rest
              >
            : Next extends SingleCharOperator
            ? ScannerFrom<Next, Rest>
            : Next extends "["
            ? List<Rest>
            : Next extends Bound.StartChar
            ? Bound<Next, Rest>
            : Next extends " "
            ? Operator<Rest>
            : Error<`Unexpected operator '${Next}'`, Unscanned>
        : ScannerFrom<"END", []>

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

    type List<Unscanned extends unknown[]> = Unscanned extends Scan<
        "]",
        infer Rest
    >
        ? ScannerFrom<"[]", Rest>
        : Error<`Missing expected ']'.`, Unscanned>

    type EnclosedBase<
        Enclosing extends EnclosedBaseStartChar,
        Contents extends string,
        Unscanned extends unknown[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends Enclosing
            ? ScannerFrom<`${Enclosing}${Contents}${Enclosing}`, Rest>
            : EnclosedBase<Enclosing, `${Contents}${Next}`, Rest>
        : Error<`${Contents} requires a closing ${Enclosing}.`, Unscanned>

    type UnenclosedBase<
        Fragment extends string,
        Unscanned extends unknown[]
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTermatingChar
            ? ScannerFrom<Fragment, Unscanned>
            : UnenclosedBase<`${Fragment}${Next}`, Rest>
        : ScannerFrom<Fragment, []>

    type Error<
        Message extends string,
        Unscanned extends unknown[]
    > = ScannerFrom<ErrorToken<Message>, Unscanned>
}
