import { Left, State } from "../parser/index.js"
import { Lexer } from "../parser/scanner.js"
import { Branches } from "./branch/index.js"

export namespace Group {
    export type ReduceOpen<L extends Left.T.Base> = Left.T.From<{
        bounds: L["bounds"]
        groups: [...L["groups"], L["branches"]]
        branches: {}
        root: undefined
    }>

    export const parseOpen = (s: State.V) => {
        s.groups.push(s.branches)
        s.branches = {}
        Lexer.shiftBase(s.scanner)
    }

    type PopGroup<
        Stack extends Branches.TypeState[],
        Top extends Branches.TypeState
    > = [...Stack, Top]

    export type ReduceClose<L extends Left.T.Base> =
        L["groups"] extends PopGroup<infer Stack, infer Top>
            ? Left.T.From<{
                  bounds: L["bounds"]
                  groups: Stack
                  branches: Top
                  root: Branches.MergeAll<L["branches"], L["root"]>
              }>
            : Left.T.Error<`Unexpected ).`>

    export const parseClose = (s: State.V) => {
        const previousBranches = s.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        Branches.mergeAll(s)
        s.branches = previousBranches
        Lexer.shiftOperator(s.scanner)
    }
}
