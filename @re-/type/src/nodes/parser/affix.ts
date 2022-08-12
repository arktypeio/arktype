// import { Bound } from "../index.js"
// import { State } from "./state.js"
// import { ErrorToken } from "./tokens.js"

// type TwoCharComparator = "<=" | ">=" | "=="
// type SingleCharComparator = "<" | ">"

// // export type ParsePrefixes<Def extends string> = ParsePossibleLeftBound<
// //     InitializeAffixState<Def>
// // >

// export type ParseSuffixes<
//     Root,
//     Unscanned extends string,
//     Bounds extends Bound.Raw
// > = ParsePossibleRightBound<
//     ParsePossibleOptional<{ final: Root; unscanned: Unscanned; bounds: Bounds }>
// >

// type ParsePossibleOptional<S extends AffixState> =
//     S["unscanned"] extends `${infer Rest}?`
//         ? AffixStateFrom<{
//               bounds: S["bounds"]
//               final: [S["final"], "?"]
//               unscanned: Rest
//           }>
//         : S

// // type ParsePossibleLeftBound<S extends AffixState> =
// //     S["unscanned"] extends `${infer LeftValue extends number}${TwoCharComparator}${infer Rest}`
// //         ? S["unscanned"] extends `${LeftValue}${infer Token}${Rest}`
// //             ? AffixStateFrom<{
// //                   bounds: {
// //                       left: [LeftValue, Token]
// //                   }
// //                   final: S["final"]
// //                   unscanned: Rest
// //               }>
// //             : never
// //         : S["unscanned"] extends `${infer LeftValue extends number}${SingleCharComparator}${infer Rest}`
// //         ? S["unscanned"] extends `${LeftValue}${infer Token}${Rest}`
// //             ? AffixStateFrom<{
// //                   bounds: {
// //                       left: [LeftValue, Token]
// //                   }
// //                   final: S["final"]
// //                   unscanned: Rest
// //               }>
// //             : never
// //         : S

// type ParsePossibleRightBound<S extends AffixState> =
//     S["unscanned"] extends `${infer Rest}${TwoCharComparator}${infer RightValue extends number}`
//         ? S["unscanned"] extends `${Rest}${infer Token}${RightValue}`
//             ? AffixStateFrom<{
//                   bounds: S["bounds"] & {
//                       right: [Token, RightValue]
//                   }
//                   final: S["final"]
//                   unscanned: Rest
//               }>
//             : never
//         : S["unscanned"] extends `${infer Rest}${SingleCharComparator}${infer RightValue extends number}`
//         ? S["unscanned"] extends `${Rest}${infer Token}${RightValue}`
//             ? AffixStateFrom<{
//                   bounds: S["bounds"] & {
//                       right: [Token, RightValue]
//                   }
//                   final: S["final"]
//                   unscanned: Rest
//               }>
//             : never
//         : S

// export type AffixState = {
//     bounds: Bound.Raw
//     final: unknown
//     unscanned: string
// }

// type AffixStateFrom<S extends AffixState> = S

// type InitializeAffixState<Unscanned extends string> = AffixStateFrom<{
//     bounds: {}
//     final: undefined
//     unscanned: Unscanned
// }>

// // export type FinalizeTree<
// //     Root,
// //     A extends Affixes
// // > = Root extends ErrorToken<string>
// //     ? Root
// //     : // TODO: Bounds should be validated before parse. Find a way to communicate better between phases
// //     Bound.Validate<A["bounds"], Root> extends ErrorToken<infer Message>
// //     ? ErrorToken<Message>
// //     : A["optional"] extends true
// //     ? [Root, "?"]
// //     : Root
