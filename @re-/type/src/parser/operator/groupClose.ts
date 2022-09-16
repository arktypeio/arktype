import { Left } from "../parser/left.js"
import { parserState } from "../parser/state.js"
import { Branches, mergeBranches, MergeBranches } from "./branch/branch.js"

type PopGroup<Stack extends Branches[], Top extends Branches> = [...Stack, Top]

const unexpectedGroupCloseMessage = `Unexpected ).`
type UnexpectedGroupCloseMessage = typeof unexpectedGroupCloseMessage

export type ReduceGroupClose<L extends Left> = L["groups"] extends PopGroup<
    infer Stack,
    infer Top
>
    ? Left.From<{
          lowerBound: L["lowerBound"]
          groups: Stack
          branches: Top
          root: MergeBranches<L["branches"], L["root"]>
      }>
    : Left.Error<UnexpectedGroupCloseMessage>

export const reduceGroupClose = (s: parserState.withRoot) => {
    const previousBranches = s.l.groups.pop()
    if (!previousBranches) {
        return s.error(unexpectedGroupCloseMessage)
    }
    mergeBranches(s)
    s.l.branches = previousBranches
    return s
}
