import { Lexer } from "../../parser/index.js"
import { ParserState } from "../../parser/state.js"

export namespace Branches {
    export type Token = "|" | "&"

    export type State = {
        union?: Branch
        intersection?: Branch
    }

    export type Branch = [unknown, string]

    export type MergeAll<B extends Branches.State, Root> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Root>
    >

    export type Parse<
        S extends ParserState.State,
        B extends Branches.State,
        Dict
    > = ParserState.From<{
        L: {
            groups: S["L"]["groups"]
            branches: B
            root: undefined
            ctx: S["L"]["ctx"]
        }
        R: Lexer.ShiftBase<S["R"]["unscanned"], Dict>
    }>

    export type MergeExpression<
        B extends Branch | undefined,
        Expression
    > = B extends Branch ? [...B, Expression] : Expression
}
