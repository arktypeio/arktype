import { Expression } from "../parser/common.js"
import { Lexer } from "../parser/lexer.js"
import { Branches } from "./branch/index.js"

export namespace Group {
    export type ParseOpen<S extends Expression.T.State> = Expression.T.From<{
        groups: [...S["groups"], S["branches"]]
        branches: {}
        root: undefined
    }>

    export const parseOpen = (s: Expression.State) => {
        s.groups.push(s.branches)
        s.branches = {}
        Lexer.shiftBase(s.scanner)
    }

    type PopGroup<
        Stack extends Branches.TypeState[],
        Top extends Branches.TypeState
    > = [...Stack, Top]

    export type ParseClose<S extends Expression.T.State> =
        S["groups"] extends PopGroup<infer Stack, infer Top>
            ? Expression.T.From<{
                  groups: Stack
                  root: Branches.MergeAll<S["branches"], S["root"]>
                  branches: Top
              }>
            : Expression.T.Error<S, `Unexpected ).`>

    export const parseClose = (s: Expression.State) => {
        const previousBranches = s.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        Branches.mergeAll(s)
        s.branches = previousBranches
        Lexer.shiftOperator(s.scanner)
    }
}
