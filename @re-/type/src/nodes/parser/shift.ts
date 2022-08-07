import { Terminal } from "../index.js"
import { Bound } from "../nonTerminal/index.js"
import { EnclosedBaseStartChar, ErrorToken } from "./tokens.js"

export type Scan<
    First extends string,
    Unscanned extends string
> = `${First}${Unscanned}`

export type ScanLeftward<
    Unscanned extends string,
    Last extends string
> = `${Unscanned}${Last}`

export namespace Shift {
    export type ScannerFrom<Lookahead, Unscanned extends string> = {
        lookahead: Lookahead
        unscanned: Unscanned
    }

    export type TypeScanner = {
        lookahead: unknown
        unscanned: string
    }

    type SingleCharOperator = "|" | "&" | ")"

    type BaseTerminatingChar = "?" | SingleCharOperator | "[" | Bound.Char | " "

    export type Base<Unscanned extends string> = Unscanned extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends "("
            ? ScannerFrom<"(", Rest>
            : Next extends EnclosedBaseStartChar
            ? EnclosedBase<Next, "", Rest>
            : Next extends " "
            ? Base<Rest>
            : UnenclosedBase<Next, Rest>
        : Error<`Expected an expression.`, "">

    export type Operator<Unscanned extends string> = Unscanned extends Scan<
        infer Next,
        infer Rest
    >
        ? Next extends SingleCharOperator
            ? ScannerFrom<Next, Rest>
            : Next extends "["
            ? List<Rest>
            : Next extends " "
            ? Operator<Rest>
            : Error<`Unexpected operator '${Next}'`, Unscanned>
        : ScannerFrom<"END", "">

    type List<Unscanned extends string> = Unscanned extends Scan<
        "]",
        infer Rest
    >
        ? ScannerFrom<"[]", Rest>
        : Error<`Missing expected ']'.`, Unscanned>

    type EnclosedBase<
        Enclosing extends EnclosedBaseStartChar,
        Contents extends string,
        Unscanned extends string
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends Enclosing
            ? ScannerFrom<`${Enclosing}${Contents}${Enclosing}`, Rest>
            : EnclosedBase<Enclosing, `${Contents}${Next}`, Rest>
        : Error<`${Contents} requires a closing ${Enclosing}.`, Unscanned>

    type Bound<
        Start extends Bound.Char,
        Unscanned extends string
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends "="
            ? ScannerFrom<`${Start}=`, Rest>
            : Start extends "="
            ? Error<`= is not a valid comparator. Use == instead.`, Unscanned>
            : ScannerFrom<Start, Unscanned>
        : Error<`Expected a bound condition after ${Start}.`, Unscanned>

    type UnenclosedBase<
        Fragment extends string,
        Unscanned extends string
    > = Unscanned extends Scan<infer Next, infer Rest>
        ? Next extends BaseTerminatingChar
            ? ScannerFrom<Terminal.UnenclosedToken<Fragment>, Unscanned>
            : UnenclosedBase<`${Fragment}${Next}`, Rest>
        : ScannerFrom<Terminal.UnenclosedToken<Fragment>, "">

    type Error<Message extends string, Unscanned extends string> = ScannerFrom<
        ErrorToken<Message>,
        Unscanned
    >
}
