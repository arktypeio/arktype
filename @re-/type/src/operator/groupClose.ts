import { Branches } from "./branch/index.js"
import { Left, left, state } from "./common.js"

type PopGroup<
    Stack extends Branches.TypeState[],
    Top extends Branches.TypeState
> = [...Stack, Top]

export type Reduce<L extends Left.Base> = L["groups"] extends PopGroup<
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

export const reduce = (s: state<left.withRoot>) => {
    const previousBranches = s.l.groups.pop()
    if (previousBranches === undefined) {
        throw new Error(`Unexpected ).`)
    }
    Branches.mergeAll(s)
    s.l.branches = previousBranches
    return s
}
