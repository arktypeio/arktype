import { Iterate } from "@re-/tools"
import { Terminal } from "../index.js"
import { Bound } from "../nonTerminal/index.js"
import { EnclosedBaseStartChar, ErrorToken } from "./tokens.js"

export type ScanDirection = "left" | "right"

export type Scan<First extends string, Unscanned extends unknown[]> = [
    First,
    ...Unscanned
]

export type DirectionalScan<
    Next extends string,
    Unscanned extends unknown[],
    Reverse extends boolean
> = Reverse extends true ? ScanLeftward<Unscanned, Next> : Scan<Next, Unscanned>

export type ScanLeftward<Unscanned extends unknown[], Last extends string> = [
    ...Unscanned,
    Last
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

    type SingleCharOperator = "|" | "&" | ")"

    type BaseTerminatingChar = "?" | SingleCharOperator | "[" | Bound.Char | " "

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
            : // @ts-ignore TODO figure out what to do with string type?
              UnenclosedBase<Next, Rest>
        : Error<`Expected an expression.`, []>

    export type Operator<Unscanned extends unknown[]> = Unscanned extends Scan<
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
        : ScannerFrom<"END", []>

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
        ? Next extends BaseTerminatingChar
            ? ScannerFrom<Terminal.UnenclosedToken<Fragment>, Unscanned>
            : UnenclosedBase<`${Fragment}${Next}`, Rest>
        : ScannerFrom<Terminal.UnenclosedToken<Fragment>, []>

    type Error<
        Message extends string,
        Unscanned extends unknown[]
    > = ScannerFrom<ErrorToken<Message>, Unscanned>

    export type Suffix<Unscanned extends unknown[]> =
        Unscanned extends ScanLeftward<infer Rest, infer Last>
            ? Last extends "?"
                ? ScannerFrom<"?", Rest>
                : PossibleBoundSuffix<Unscanned, "", Unscanned>
            : ScannerFrom<"", Unscanned>

    export type Prefix<Unscanned extends unknown[]> = PossibleBoundPrefix<
        Base<Unscanned>
    >

    type PossibleBoundSuffix<
        OriginalUnscanned extends unknown[],
        PossibleBoundingValue extends string,
        Unscanned extends unknown[]
    > = Unscanned extends ScanLeftward<infer Rest, infer Last>
        ? Last extends BaseTerminatingChar | EnclosedBaseStartChar
            ? Last extends Bound.Char
                ? Bound<Last, Rest, true, PossibleBoundingValue>
                : ScannerFrom<"", OriginalUnscanned>
            : PossibleBoundSuffix<
                  OriginalUnscanned,
                  `${Last}${PossibleBoundingValue}`,
                  Rest
              >
        : ScannerFrom<"", OriginalUnscanned>

    type PossibleBoundPrefix<S extends TypeScanner> =
        S["unscanned"] extends Scan<infer Next, infer Rest>
            ? Next extends Bound.Char
                ? Bound<Next, Rest, false, S["lookahead"]>
                : S
            : S

    type DirectionalConcat<
        Left,
        Right,
        Reverse extends boolean
    > = Reverse extends true ? [Right, Left] : [Left, Right]

    type DirectionalStrConcat<
        Left extends string,
        Right extends string,
        Reverse extends boolean
    > = Reverse extends true ? `${Right}${Left}` : `${Left}${Right}`

    type Bound<
        FirstEncountered extends Bound.Char,
        Unscanned extends unknown[],
        Reverse extends boolean,
        BoundingValue
    > = Unscanned extends DirectionalScan<infer Next, infer Rest, Reverse>
        ? DirectionalStrConcat<
              FirstEncountered,
              Next,
              Reverse
          > extends Bound.Token
            ? ScannerFrom<
                  DirectionalConcat<
                      BoundingValue,
                      DirectionalStrConcat<FirstEncountered, Next, Reverse>,
                      Reverse
                  >,
                  Rest
              >
            : FirstEncountered extends "="
            ? Error<`= is not a valid comparator. Use == instead.`, Unscanned>
            : ScannerFrom<
                  DirectionalConcat<BoundingValue, FirstEncountered, Reverse>,
                  Unscanned
              >
        : Error<
              `Expected an expression ${Reverse extends true
                  ? "before"
                  : "after"} ${FirstEncountered}.`,
              []
          >

    // type LeftBound<
    //     Start extends Bound.Char,
    //     Unscanned extends unknown[],
    //     Value
    // > = Unscanned extends Scan<infer Next, infer Rest>
    //     ? Next extends "="
    //         ? ScannerFrom<[Value, `${Start}=`], Rest>
    //         : Start extends "="
    //         ? Error<`= is not a valid comparator. Use == instead.`, Unscanned>
    //         : ScannerFrom<[Value, Start], Unscanned>
    //     : Error<`Expected a bound condition after ${Start}.`, []>

    // type RightBound<
    //     Start extends Bound.Char,
    //     Unscanned extends unknown[],
    //     Value
    // > = Unscanned extends ScanLeftward<infer Rest, infer Next>
    //     ? Next extends Bound.Boundable
    //         ? ScannerFrom<[Value, `${Start}=`], Rest>
    //         : Start extends "="
    //         ? Error<`= is not a valid comparator. Use == instead.`, Unscanned>
    //         : ScannerFrom<[Value, Start], Unscanned>
    //     : Error<`Expected a bound condition after ${Start}.`, []>
}
