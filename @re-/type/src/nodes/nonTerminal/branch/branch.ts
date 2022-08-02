import { Shift } from "../../parser/index.js"
import { ParserState } from "../../parser/state.js"

export namespace Branches {
    export type Token = "|" | "&"

    export type Branch = [] | [unknown, string]

    export type MergeAll<T extends ParserState.Tree> = MergeExpression<
        T["union"],
        MergeExpression<T["intersection"], T["root"]>
    >

    export type Parse<
        S extends ParserState.State,
        Tree extends ParserState.Tree,
        Dict
    > = ParserState.From<{
        L: {
            tree: Tree
            ctx: S["L"]["ctx"]
        }
        R: Shift.Base<S["R"]["unscanned"], Dict>
    }>

    type ExtractIfSingleton<T> = T extends [infer Element] ? Element : T

    export type MergeExpression<
        B extends Branch,
        Expression
    > = ExtractIfSingleton<[...B, Expression]>
}
