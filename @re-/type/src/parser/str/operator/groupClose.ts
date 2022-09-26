import type { Left } from "../state/left.js"
import type { parserState } from "../state/state.js"
import type { Branches, MergeBranches } from "./binary/branch.js"
import { mergeBranches } from "./binary/branch.js"

type PopGroup<Stack extends Branches[], Top extends Branches> = [...Stack, Top]

type UnexpectedGroupCloseMessage<Unscanned extends string> =
    `Unexpected )${Unscanned extends "" ? "" : ` before ${Unscanned}`}.`

export const unexpectedGroupCloseMessage = <Unscanned extends string>(
    unscanned: Unscanned
): UnexpectedGroupCloseMessage<Unscanned> =>
    `Unexpected )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}.`

export type ReduceGroupClose<
    L extends Left,
    Unscanned extends string
> = L["groups"] extends PopGroup<infer Stack, infer Top>
    ? Left.From<{
          lowerBound: L["lowerBound"]
          groups: Stack
          branches: Top
          root: MergeBranches<L["branches"], L["root"]>
      }>
    : Left.Error<UnexpectedGroupCloseMessage<Unscanned>>

export const reduceGroupClose = (s: parserState.withRoot) => {
    const previousBranches = s.l.groups.pop()
    if (!previousBranches) {
        return s.error(unexpectedGroupCloseMessage(s.r.unscanned))
    }
    mergeBranches(s)
    s.l.branches = previousBranches
    return s
}
