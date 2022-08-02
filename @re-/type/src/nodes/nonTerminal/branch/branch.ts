import type { Shift } from "../../parser/shift.js"
import { ParserState } from "../../parser/state.js"

export namespace Branches {
    export type State = {
        union: Branch
        intersection: Branch
    }

    export type Initial = {
        union: []
        intersection: []
    }

    export type Token = "|" | "&"

    export type Branch = [] | [unknown, string]

    export type MergeAll<B extends State, Expression> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Expression>
    >

    export type ParseToken<
        S extends ParserState.State,
        Branch extends State,
        Dict
    > = ParserState.From<{
        L: {
            groups: S["L"]["groups"]
            branches: Branch
            expression: []
            bounds: S["L"]["bounds"]
        }
        R: Shift.Base<S["R"]["unscanned"], Dict>
    }>

    type ExtractIfSingleton<T> = T extends [infer Element] ? Element : T

    export type MergeExpression<
        B extends Branch,
        Expression
    > = ExtractIfSingleton<[...B, Expression]>
}
