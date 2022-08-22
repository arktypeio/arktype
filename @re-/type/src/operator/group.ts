import { Left, left, state } from "../parser/index.js"
import { Branches } from "./branch/index.js"

export namespace Group {
    export type ReduceOpen<L extends Left.Base> = Left.From<{
        bounds: L["bounds"]
        groups: [...L["groups"], L["branches"]]
        branches: {}
        root: undefined
    }>

    export const reduceOpen = (s: state) => {
        s.l.groups.push(s.l.branches)
        s.l.branches = {}
        return s
    }

    type PopGroup<
        Stack extends Branches.TypeState[],
        Top extends Branches.TypeState
    > = [...Stack, Top]

    export type ReduceClose<L extends Left.Base> = L["groups"] extends PopGroup<
        infer Stack,
        infer Top
    >
        ? Left.From<{
              bounds: L["bounds"]
              groups: Stack
              branches: Top
              root: Branches.MergeAll<L["branches"], L["root"]>
          }>
        : Left.Error<`Unexpected ).`>

    export const reduceClose = (s: state<left.withRoot>) => {
        const previousBranches = s.l.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        Branches.mergeAll(s)
        s.l.branches = previousBranches
        return s
    }
}
