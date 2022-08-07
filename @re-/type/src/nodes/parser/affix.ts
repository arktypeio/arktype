import { ListChars } from "@re-/tools"
import { Bound } from "../index.js"
import { Shift } from "./shift.js"

export type ParseAffixes<Unscanned extends unknown[]> = ParsePrefixes<
    // @ts-ignore Random stack depth error
    ParseSuffixes<InitializeAffixState<Unscanned>>
>

type Z = ParseAffixes<ListChars<"2<string[]<3?">>

export type Affixes = {
    bounds: Bound.Raw
    optional: boolean
}

type AffixState = {
    affixes: Affixes
    scanner: Shift.TypeScanner
}

type AffixStateFrom<S extends AffixState> = S

type InitializeAffixState<Unscanned extends unknown[]> = AffixStateFrom<{
    affixes: {
        bounds: {}
        optional: false
    }
    scanner: Shift.Suffix<Unscanned>
}>

type ParsePrefixes<S extends AffixState> =
    S["scanner"]["lookahead"] extends Bound.RawLeft
        ? AffixStateFrom<{
              affixes: {
                  bounds: {
                      left: S["scanner"]["lookahead"]
                      right: S["affixes"]["bounds"]["right"]
                  }
                  optional: S["affixes"]["optional"]
              }
              scanner: Shift.Base<S["scanner"]["unscanned"]>
          }>
        : S

type ParseSuffixes<S extends AffixState> = S["scanner"]["lookahead"] extends ""
    ? AffixStateFrom<{
          affixes: S["affixes"]
          scanner: Shift.Prefix<S["scanner"]["unscanned"]>
      }>
    : ParseSuffixes<ParseSuffix<S>>

type ParseSuffix<S extends AffixState> = S["scanner"]["lookahead"] extends "?"
    ? ParseSuffix<{
          affixes: {
              bounds: {}
              optional: true
          }
          scanner: Shift.Suffix<S["scanner"]["unscanned"]>
      }>
    : S["scanner"]["lookahead"] extends Bound.RawRight
    ? AffixStateFrom<{
          affixes: {
              bounds: {
                  right: S["scanner"]["lookahead"]
              }
              optional: S["affixes"]["optional"]
          }
          scanner: Shift.Suffix<S["scanner"]["unscanned"]>
      }>
    : S

// // export type Apply<
// //     S extends Expression.T.State,
// //     A extends Affixes
// // > = S["tree"]["root"] extends ErrorToken<string>
// //     ? S
// //     : // TODO: Bounds should be validated before parse. Find a way to communicate better between phases
// //     Bound.Validate<A["bounds"], S["tree"]["root"]> extends ErrorToken<
// //           infer Message
// //       >
// //     ? Expression.T.Error<S, Message>
// //     : A["optional"] extends true
// //     ? Expression.T.From<{
// //           tree: Expression.T.SetRoot<S, [S["tree"]["root"], "?"]>
// //           scanner: S["scanner"]
// //       }>
// //     : S
