import { Expression } from "../parser/expression.js"
import { Lexer } from "../parser/lexer.js"
import { Branches } from "./branch/index.js"

export namespace Group {
    export type ParseOpen<S extends Expression.State.Type> =
        Expression.State.From<{
            groups: [...S["groups"], S["branches"]]
            branches: {}
            root: undefined
        }>

    export const parseOpen = (s: Expression.State.Value) => {
        s.groups.push(s.branches)
        s.branches = {}
        Lexer.shiftBase(s.scanner)
    }

    type PopGroup<
        Stack extends Branches.TypeState[],
        Top extends Branches.TypeState
    > = [...Stack, Top]

    export type ParseClose<S extends Expression.State.Type> =
        S["groups"] extends PopGroup<infer Stack, infer Top>
            ? Expression.State.From<{
                  groups: Stack
                  root: Branches.MergeAll<S["branches"], S["root"]>
                  branches: Top
              }>
            : Expression.State.Error<S, `Unexpected ).`>

    export const parseClose = (s: Expression.State.Value) => {
        const previousBranches = s.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        Branches.mergeAll(s)
        s.branches = previousBranches
        Lexer.shiftOperator(s.scanner)
    }
}
