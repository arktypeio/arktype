// import { ListChars } from "@re-/tools"
// import { Bound } from "../index.js"
// import { Expression } from "./expression.js"
// import { Shift } from "./shift.js"
// import { ErrorToken } from "./tokens.js"

// export type ParseAffixes<Unscanned extends string> = ParseSuffixes<Unscanned>

// type ParseSuffixes<Unscanned extends string> =
//     Unscanned extends `${infer Rest}?`
//         ? ParsePossibleRightBound<Rest>
//         : ParsePossibleRightBound<Unscanned>

// type ParsePossibleRightBound<Unscanned extends string> =
//     Unscanned extends `${infer Rest}${infer Token extends Bound.Token}${infer N extends NumberLiteralDefinition}`
//         ? [Rest, Token, N]
//         : Unscanned

// export type Affixes = {
//     bounds: Bound.Raw
//     optional: boolean
// }

// export type AffixState = {
//     affixes: Affixes
//     scanner: Shift.TypeScanner
// }

// type AffixStateFrom<S extends AffixState> = S

// type InitializeAffixState<Unscanned extends string> = AffixStateFrom<{
//     affixes: {
//         bounds: {}
//         optional: false
//     }
//     // Shift.Suffix<
//     scanner: Shift.Base<Unscanned>
// }>

// type ParsePrefixes<S extends AffixState> =
//     S["scanner"]["lookahead"] extends Bound.RawLeft
//         ? AffixStateFrom<{
//               affixes: {
//                   bounds: {
//                       left: S["scanner"]["lookahead"]
//                       right: S["affixes"]["bounds"]["right"]
//                   }
//                   optional: S["affixes"]["optional"]
//               }
//               scanner: Shift.Base<S["scanner"]["unscanned"]>
//           }>
//         : S

// type ParseSuffixes<S extends AffixState> = S["scanner"]["lookahead"] extends ""
//     ? AffixStateFrom<{
//           affixes: S["affixes"]
//           scanner: Shift.Prefix<S["scanner"]["unscanned"]>
//       }>
//     : S["scanner"]["lookahead"] extends ErrorToken<string>
//     ? S
//     : ParseSuffixes<ParseSuffix<S>>

// type ParseSuffix<S extends AffixState> = S["scanner"]["lookahead"] extends "?"
//     ? ParseSuffix<{
//           affixes: {
//               bounds: {}
//               optional: true
//           }
//           scanner: Shift.Suffix<S["scanner"]["unscanned"]>
//       }>
//     : S["scanner"]["lookahead"] extends Bound.RawRight
//     ? AffixStateFrom<{
//           affixes: {
//               bounds: {
//                   right: S["scanner"]["lookahead"]
//               }
//               optional: S["affixes"]["optional"]
//           }
//           scanner: Shift.Suffix<S["scanner"]["unscanned"]>
//       }>
//     : S

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
