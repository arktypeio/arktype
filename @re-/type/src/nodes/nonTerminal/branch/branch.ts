import { Lexer } from "../../parser/index.js"
import { ParserState } from "../../parser/state.js"
import { IntersectionNode } from "./intersection.js"
import { UnionNode } from "./union.js"

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

    export type Parse<
        S extends ParserState.State,
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
