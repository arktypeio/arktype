import { ErrorToken, State } from "../parser/index.js"
import { Lexer } from "../parser/lexer.js"
import { Branches } from "./branch/index.js"

export namespace Group {
    export type ReduceOpen<Tree extends State.Tree> = State.TreeFrom<{
        groups: [...Tree["groups"], Tree["branches"]]
        branches: {}
        root: undefined
    }>

    export const parseOpen = (s: State.Value) => {
        s.groups.push(s.branches)
        s.branches = {}
        Lexer.shiftBase(s.scanner)
    }

    type PopGroup<
        Stack extends Branches.TypeState[],
        Top extends Branches.TypeState
    > = [...Stack, Top]

    export type ReduceClose<Tree extends State.Tree> =
        Tree["groups"] extends PopGroup<infer Stack, infer Top>
            ? State.TreeFrom<{
                  groups: Stack
                  branches: Top
                  root: Branches.MergeAll<Tree["branches"], Tree["root"]>
              }>
            : State.TreeFrom<{
                  groups: Tree["groups"]
                  branches: Tree["branches"]
                  root: ErrorToken<`Unexpected ).`>
              }>

    export const parseClose = (s: State.Value) => {
        const previousBranches = s.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        Branches.mergeAll(s)
        s.branches = previousBranches
        Lexer.shiftOperator(s.scanner)
    }
}
