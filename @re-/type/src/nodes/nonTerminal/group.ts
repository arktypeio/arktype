import type { Shift } from "../parser/shift.js"
import { ParserState } from "../parser/state.js"
import type { Branches } from "./branch/branch.js"

export namespace Group {
    export type State = Branches.State[]

    export type ParseOpen<
        S extends ParserState.State,
        Dict
    > = ParserState.From<{
        L: {
            groups: [...S["L"]["groups"], S["L"]["branches"]]
            branches: Branches.Initial
            expression: []
            bounds: S["L"]["bounds"]
        }
        R: Shift.Base<S["R"]["unscanned"], Dict>
    }>

    type PopGroup<Stack extends State, Top extends Branches.State> = [
        ...Stack,
        Top
    ]

    export type ParseClose<S extends ParserState.State> =
        S["L"]["groups"] extends PopGroup<infer Stack, infer Top>
            ? ParserState.From<{
                  L: {
                      groups: Stack
                      branches: Top
                      expression: Branches.MergeAll<
                          S["L"]["branches"],
                          S["L"]["expression"]
                      >
                      bounds: S["L"]["bounds"]
                  }
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>
            : ParserState.Error<S, `Unexpected ).`>
}
