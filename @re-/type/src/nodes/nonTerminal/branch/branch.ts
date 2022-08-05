import { Lexer } from "../../parser/index.js"
import { State } from "../../parser/state.js"
import { Intersection, IntersectionNode } from "./intersection.js"
import { Union, UnionNode } from "./union.js"

export namespace Branches {
    export const tokens = {
        "|": 1,
        "&": 1
    }

    export type Token = keyof typeof tokens

    export type Branch = [unknown, string]

    export type TypeState = {
        union?: Branch
        intersection?: Branch
    }

    export type ValueState = {
        union?: UnionNode
        intersection?: IntersectionNode
    }

    export type MergeAll<B extends Branches.TypeState, Root> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Root>
    >

    export const mergeAll = (s: State.Value) => {
        // TODO: Clearer way to show these can be undefined
        Intersection.merge(s)
        Union.merge(s)
    }

    export type Parse<
        S extends State.Type,
        B extends Branches.TypeState
    > = State.From<{
        groups: S["groups"]
        branches: B
        root: undefined
        scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
    }>

    export type MergeExpression<
        B extends Branch | undefined,
        Expression
    > = B extends Branch ? [...B, Expression] : Expression
}
