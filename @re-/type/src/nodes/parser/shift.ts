import { Terminal } from "../index.js"
import { Bound } from "../nonTerminal/index.js"
import { NumberLiteralDefinition } from "../terminal/index.js"
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

    // export type Suffix<Unscanned extends string> =
    //     Unscanned extends ScanLeftward<infer Rest, infer Last>
    //         ? Last extends "?"
    //             ? ScannerFrom<"?", Rest>
    //             : PossibleBoundSuffix<Unscanned, "", Unscanned>
    //         : ScannerFrom<"", Unscanned>

    // export type Prefix<Unscanned extends string> = PossibleBoundPrefix<
    //     Base<Unscanned>
    // >

    // type PossibleBoundSuffix<
    //     OriginalUnscanned extends string,
    //     PossibleBoundingValue extends string,
    //     Unscanned extends string
    // > = Unscanned extends ScanLeftward<infer Rest, infer Last>
    //     ? Last extends BaseTerminatingChar | EnclosedBaseStartChar
    //         ? Last extends Bound.Char
    //             ? Bound<Last, Rest, true, PossibleBoundingValue>
    //             : ScannerFrom<"", OriginalUnscanned>
    //         : PossibleBoundSuffix<
    //               OriginalUnscanned,
    //               `${Last}${PossibleBoundingValue}`,
    //               Rest
    //           >
    //     : ScannerFrom<"", OriginalUnscanned>

    // type PossibleBoundPrefix<S extends TypeScanner> =
    //     S["unscanned"] extends Scan<infer Next, infer Rest>
    //         ? Next extends Bound.Char
    //             ? Bound<Next, Rest, false, S["lookahead"]>
    //             : S
    //         : S

    // type DirectionalConcat<
    //     Left,
    //     Right,
    //     Reverse extends boolean
    // > = Reverse extends true ? [Right, Left] : [Left, Right]

    // type DirectionalStrConcat<
    //     Left extends string,
    //     Right extends string,
    //     Reverse extends boolean
    // > = Reverse extends true ? `${Right}${Left}` : `${Left}${Right}`

    // type Bound<
    //     FirstEncountered extends Bound.Char,
    //     Unscanned extends string,
    //     Reverse extends boolean,
    //     BoundingValue
    // > = Unscanned extends DirectionalScan<infer Next, infer Rest, Reverse>
    //     ? DirectionalStrConcat<
    //           FirstEncountered,
    //           Next,
    //           Reverse
    //       > extends Bound.Token
    //         ? ScannerFrom<
    //               DirectionalConcat<
    //                   BoundingValue,
    //                   DirectionalStrConcat<FirstEncountered, Next, Reverse>,
    //                   Reverse
    //               >,
    //               Rest
    //           >
    //         : FirstEncountered extends "="
    //         ? Error<`= is not a valid comparator. Use == instead.`, Unscanned>
    //         : ScannerFrom<
    //               DirectionalConcat<BoundingValue, FirstEncountered, Reverse>,
    //               Unscanned
    //           >
    //     : Error<
    //           `Expected an expression ${Reverse extends true
    //               ? "before"
    //               : "after"} ${FirstEncountered}.`,
    //           []
    //       >
}
