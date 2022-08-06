import { ErrorToken, Expression } from "../parser/index.js"
import { Lex } from "../parser/lex.js"
import { Lexer } from "../parser/lexer.js"
import { Branches } from "./branch/index.js"

export namespace Group {
    export type ParseOpen<S extends Expression.T.State> = Expression.T.From<{
        tree: ReduceOpen<S["tree"]>
        scanner: Lex.ShiftToken<S["scanner"]["unscanned"]>
    }>

    export type ReduceOpen<Tree extends Expression.T.Tree> =
        Expression.T.TreeFrom<{
            groups: [...Tree["groups"], Tree["branches"]]
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

    export type ParseClose<S extends Expression.T.State> = Expression.T.From<{
        tree: ReduceClose<S["tree"]>
        scanner: Lex.ShiftToken<S["scanner"]["unscanned"]>
    }>

    export type ReduceClose<Tree extends Expression.T.Tree> =
        Tree["groups"] extends PopGroup<infer Stack, infer Top>
            ? Expression.T.TreeFrom<{
                  groups: Stack
                  branches: Top
                  root: Branches.MergeAll<Tree["branches"], Tree["root"]>
              }>
            : Expression.T.TreeFrom<{
                  groups: Tree["groups"]
                  branches: Tree["branches"]
                  root: [ErrorToken<`Unexpected ).`>]
              }>

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
