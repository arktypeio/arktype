import { Branches, MergeBranches, mergeBranches } from "./branches/index.js"
import { Parser } from "./common.js"

type PopGroup<Stack extends Branches[], Top extends Branches> = [...Stack, Top]

const unexpectedGroupCloseMessage = `Unexpected ).`
type UnexpectedGroupCloseMessage = typeof unexpectedGroupCloseMessage

export type ReduceGroupClose<L extends Parser.Left> =
    L["groups"] extends PopGroup<infer Stack, infer Top>
        ? Parser.Left.From<{
              leftBound: L["leftBound"]
              groups: Stack
              branches: Top
              root: MergeBranches<L["branches"], L["root"]>
          }>
        : Parser.Left.Error<UnexpectedGroupCloseMessage>

export const reduceGroupClose = (s: Parser.state<Parser.left.withRoot>) => {
    const previousBranches = s.l.groups.pop()
    if (previousBranches === undefined) {
        return s.error(unexpectedGroupCloseMessage)
    }
    mergeBranches(s)
    s.l.branches = previousBranches
    return s
}
