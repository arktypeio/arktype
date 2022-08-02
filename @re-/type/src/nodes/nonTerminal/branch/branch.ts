import type { ParserType } from "../../parser.js"
import type { Shift } from "../../shift.js"

export namespace Branches {
    export type State = {
        union: Branch
        intersection: Branch
    }

    export type Initial = {
        union: []
        intersection: []
    }

    export type Branch = [] | [unknown, string]

    export type MergeAll<B extends State, Expression> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Expression>
    >

    export type ParseToken<
        S extends ParserType.State,
        Branch extends State,
        Dict
    > = ParserType.StateFrom<{
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
