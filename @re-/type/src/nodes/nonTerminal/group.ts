import type { Shift } from "../shift.js"
import type {
    BranchState,
    DefaultBranchState,
    ErrorState,
    MergeBranches,
    State,
    StateFrom
} from "../str.js"

export namespace GroupType {
    export type ParseOpen<S extends State, Dict> = StateFrom<{
        L: {
            openGroups: [...S["L"]["openGroups"], S["L"]["branch"]]
            branch: DefaultBranchState
            expression: []
            bounds: S["L"]["bounds"]
        }
        R: Shift.Base<S["R"]["unscanned"], Dict>
    }>

    type PopGroup<Stack extends BranchState[], Top extends BranchState> = [
        ...Stack,
        Top
    ]

    export type ParseClose<S extends State> =
        S["L"]["openGroups"] extends PopGroup<infer Stack, infer Top>
            ? StateFrom<{
                  L: {
                      openGroups: Stack
                      branch: Top
                      expression: MergeBranches<
                          S["L"]["branch"],
                          S["L"]["expression"]
                      >
                      bounds: S["L"]["bounds"]
                  }
                  R: Shift.Operator<S["R"]["unscanned"]>
              }>
            : ErrorState<S, `Unexpected ).`>
}
