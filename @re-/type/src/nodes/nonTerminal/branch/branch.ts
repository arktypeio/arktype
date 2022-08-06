import { Expression } from "../../parser/expression.js"
import { Lexer } from "../../parser/index.js"
import { Intersection, IntersectionNode } from "./intersection.js"
import { Union, UnionNode } from "./union.js"

export namespace Branches {
    export const tokens = {
        "|": 1,
        "&": 1
    }

    export type Token = keyof typeof tokens

    export type Branch = unknown[]

    export type TypeState = {
        union: Branch
        intersection: Branch
    }

    export type ValueState = {
        union?: UnionNode
        intersection?: IntersectionNode
    }

    export const mergeAll = (s: Expression.State.Value) => {
        // TODO: Clearer way to show these can be undefined
        Intersection.merge(s)
        Union.merge(s)
    }

    export type Parse<
        S extends Expression.State.Type,
        B extends Branches.TypeState
    > = Expression.State.From<{
        groups: S["groups"]
        branches: B
        root: undefined
        scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
    }>
}
