import { Lexer } from "../parser/lexer.js"
import { State } from "../parser/state.js"
import { Branches } from "./branch/branch.js"

export namespace Group {
    export type ParseOpen<S extends State.Type> = State.From<{
        groups: [...S["groups"], S["branches"]]
        branches: {}
        root: undefined
        bounds: S["bounds"]
        scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
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

    export type ParseClose<S extends State.Type> = S["groups"] extends PopGroup<
        infer Stack,
        infer Top
    >
        ? State.From<{
              groups: Stack
              root: Branches.MergeAll<S["branches"], S["root"]>
              branches: Top
              bounds: S["bounds"]
              scanner: Lexer.ShiftOperator<S["scanner"]["unscanned"]>
          }>
        : State.Error<S, `Unexpected ).`>

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
