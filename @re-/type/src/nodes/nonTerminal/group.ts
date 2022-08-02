import type { ParserType } from "../parser.js"
import type { Shift } from "../shift.js"
import type { Branches } from "./branch/branch.js"

export namespace GroupType {
    export type State = Branches.State[]

    export type OpenToken = "("

    export type CloseToken = ")"

    export type ParseOpen<
        S extends ParserType.State,
        Dict
    > = ParserType.StateFrom<{
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

    export type ParseClose<S extends ParserType.State> =
        S["L"]["groups"] extends PopGroup<infer Stack, infer Top>
            ? ParserType.StateFrom<{
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
            : ParserType.ErrorState<S, `Unexpected ).`>
}
