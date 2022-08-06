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

    export type OpenBranch = [unknown, Token]

    export type TypeState = {
        union?: OpenBranch
        intersection?: OpenBranch
    }

    export type ValueState = {
        union?: UnionNode
        intersection?: IntersectionNode
    }

    export type MergeAll<B extends Branches.TypeState, Root> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Root>
    >

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
    }>

    export type MergeExpression<
        B extends OpenBranch | undefined,
        Expression
    > = B extends OpenBranch ? [...B, Expression] : Expression
}
