import { Lexer } from "../../parser/index.js"
import { ParserState } from "../../parser/state.js"
import { Intersection, IntersectionNode } from "./intersection.js"
import { Union, UnionNode } from "./union.js"

export namespace Branches {
    export const tokens = {
        "|": 1,
        "&": 1
    }

    export type Token = keyof typeof tokens

    export type Branch = [unknown, string]

    export type State = {
        union?: Branch
        intersection?: Branch
    }

    export type state = {
        union?: UnionNode
        intersection?: IntersectionNode
    }

    export type MergeAll<B extends Branches.State, Root> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Root>
    >

    export const mergeAll = (s: ParserState.Value) => {
        // TODO: Clearer way to show these can be undefined
        Intersection.merge(s)
        Union.merge(s)
    }

    export type Parse<
        S extends ParserState.Type,
        B extends Branches.State
    > = ParserState.From<{
        L: {
            groups: S["L"]["groups"]
            branches: B
            root: undefined
            ctx: S["L"]["ctx"]
        }
        R: Lexer.ShiftBase<S["R"]["unscanned"]>
    }>

    export type MergeExpression<
        B extends Branch | undefined,
        Expression
    > = B extends Branch ? [...B, Expression] : Expression
}
