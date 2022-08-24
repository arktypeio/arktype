import { Branches } from "./branches/index.js"
import { Parser } from "./common.js"

type PopGroup<
    Stack extends Branches.BranchState[],
    Top extends Branches.BranchState
> = [...Stack, Top]

const unexpectedGroupCloseMessage = `Unexpected ).`
type UnexpectedGroupCloseMessage = typeof unexpectedGroupCloseMessage

export type ReduceGroupClose<L extends Parser.Left> =
    L["groups"] extends PopGroup<infer Stack, infer Top>
        ? Parser.Left.From<{
              leftBound: L["leftBound"]
              groups: Stack
              branches: Top
              root: Branches.MergeAll<L["branches"], L["root"]>
          }>
        : Parser.Left.Error<UnexpectedGroupCloseMessage>

export const reduceGroupClose = (s: Parser.state<Parser.left.withRoot>) => {
    const previousBranches = s.l.groups.pop()
    if (previousBranches === undefined) {
        return s.error(unexpectedGroupCloseMessage)
    }
    Branches.mergeAll(s)
    s.l.branches = previousBranches
    return s
}
