import { ListChars } from "@re-/tools"
import { Bound } from "../index.js"
import { Expression } from "./expression.js"
import { Lexer } from "./lexer.js"

export namespace Affixes {
    // export namespace State {
    //     export type Type = {
    //         scanner: Lexer.TypeScanner
    //         ctx: Context
    //     }
    //     export type Context = {
    //         bounds: {
    //             left?: Bound.Left
    //             right?: Bound.Right
    //         }
    //         optional: boolean
    //     }
    //     export type From<S extends Type> = S
    //     export type Initialize<Def extends string> = State.From<{
    //         scanner: Lexer.ShiftSuffix<ListChars<Def>>
    //         ctx: {
    //             bounds: {}
    //             optional: false
    //         }
    //     }>
    // }
    // type Z = Parse<"3<=number<=5">
    // export type Parse<Def extends string> = ParsePrefixes<
    //     ParseSuffixes<State.Initialize<Def>>
    // >
    // type ParsePrefixes<S extends State.Type> =
    //     S["scanner"]["lookahead"] extends [infer Value, infer Token]
    //         ? State.From<{
    //               scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
    //               ctx: {
    //                   bounds: {
    //                       right: S["ctx"]["bounds"]["right"]
    //                       left: [Value, Token]
    //                   }
    //                   optional: S["ctx"]["optional"]
    //               }
    //           }>
    //         : S
    // type ParseSuffixes<S extends State.Type> =
    //     S["scanner"]["lookahead"] extends ""
    //         ? State.From<{
    //               scanner: Lexer.ShiftPrefix<S["scanner"]["unscanned"]>
    //               ctx: S["ctx"]
    //           }>
    //         : S["scanner"]["lookahead"] extends "?"
    //         ? ParseSuffixes<{
    //               scanner: Lexer.ShiftSuffix<S["scanner"]["unscanned"]>
    //               ctx: {
    //                   bounds: {}
    //                   optional: true
    //               }
    //           }>
    //         : State.From<{
    //               scanner: Lexer.ShiftPrefix<S["scanner"]["unscanned"]>
    //               ctx: {
    //                   bounds: { right: S["scanner"]["lookahead"] }
    //                   optional: S["ctx"]["optional"]
    //               }
    //           }>
    // export type Apply<
    //     S extends Expression.State.Type,
    //     Context extends State.Context
    // > = S["scanner"]["lookahead"] extends "ERR"
    //     ? S
    //     : Context["optional"] extends true
    //     ? Expression.State.SetRoot<S, [S["root"], "?"]>
    //     : S
}
