import { Branches } from "./branch/index.js"
import { Parser } from "./common.js"

type PopGroup<
    Stack extends Branches.TypeState[],
    Top extends Branches.TypeState
> = [...Stack, Top]

export type Reduce<L extends Parser.Left> = L["groups"] extends PopGroup<
    infer Stack,
    infer Top
>
    ? Parser.Left.From<{
          bounds: L["bounds"]
          groups: Stack
          branches: Top
          root: Branches.MergeAll<L["branches"], L["root"]>
      }>
    : Parser.Left.Error<`Unexpected ).`>

export const reduce = (s: Parser.state<Parser.left.withRoot>) => {
    const previousBranches = s.l.groups.pop()
    if (previousBranches === undefined) {
        throw new Error(`Unexpected ).`)
    }
    Branches.mergeAll(s)
    s.l.branches = previousBranches
    return s
}
