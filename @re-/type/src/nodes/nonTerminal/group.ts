import type { Shift } from "../parser/shift.js"
import { ParserState } from "../parser/state.js"
import type { Branches } from "./branch/branch.js"

export namespace Group {
    export type ParseOpen<
        S extends ParserState.State,
        Dict
    > = ParserState.From<{
        L: {
            tree: ParserState.InitialTree
            ctx: {
                bounds: S["L"]["ctx"]["bounds"]
                groups: [...S["L"]["ctx"]["groups"], S["L"]["tree"]]
            }
        }
        R: Shift.Base<S["R"]["unscanned"], Dict>
    }>

    type PopGroup<
        Stack extends ParserState.Tree[],
        Top extends ParserState.Tree
    > = [...Stack, Top]

    export type ParseClose<S extends ParserState.State> =
        S["L"]["ctx"]["groups"] extends PopGroup<infer Stack, infer Top>
            ? ParserState.From<{
                  L: {
                      tree: {
                          root: Branches.MergeAll<S["L"]["tree"]>
                          union: Top["union"]
                          intersection: Top["intersection"]
                      }
                      ctx: {
                          groups: Stack
                          bounds: S["L"]["ctx"]["bounds"]
                      }
                  }
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>
            : ParserState.Error<S, `Unexpected ).`>
}
