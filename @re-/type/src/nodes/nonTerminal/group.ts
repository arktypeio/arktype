import { Lexer } from "../parser/lexer.js"
import { ParserState } from "../parser/state.js"
import { Branches } from "./branch/branch.js"

export namespace Group {
    export type ParseOpen<S extends ParserState.Type> = ParserState.From<{
        L: {
            groups: [...S["L"]["groups"], S["L"]["branches"]]
            branches: {}
            root: undefined
            ctx: S["L"]["ctx"]
        }
        R: Lexer.ShiftBase<S["R"]["unscanned"]>
    }>

    export const parseOpen = (s: ParserState.Value) => {
        s.groups.push(s.branches)
        s.branches = {}
        Lexer.shiftBase(s.scanner)
    }

    type PopGroup<
        Stack extends Branches.State[],
        Top extends Branches.State
    > = [...Stack, Top]

    export type ParseClose<S extends ParserState.Type> =
        S["L"]["groups"] extends PopGroup<infer Stack, infer Top>
            ? ParserState.From<{
                  L: {
                      groups: Stack
                      root: Branches.MergeAll<
                          S["L"]["branches"],
                          S["L"]["root"]
                      >
                      branches: Top
                      ctx: S["L"]["ctx"]
                  }
                  R: Lexer.ShiftOperator<S["R"]["unscanned"]>
              }>
            : ParserState.Error<S, `Unexpected ).`>

    export const parseClose = (s: ParserState.Value) => {
        const previousBranches = s.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        Branches.mergeAll(s)
        s.branches = previousBranches
        Lexer.shiftOperator(s.scanner)
    }
}
