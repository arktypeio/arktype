import type { Left } from "../state/left.js"
import { parserState } from "../state/state.js"

type PopGroup<
    Stack extends Left.OpenBranches[],
    Top extends Left.OpenBranches
> = [...Stack, Top]

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
          groups: Stack
          branches: Top
          root: MergeBranches<L["branches"], L["root"]>
      }>
    : Left.Error<UnexpectedGroupCloseMessage<Unscanned>>

export const reduceGroupClose = (s: parserState.withPreconditionRoot) => {
    const previousOpenBranches = s.l.groups.pop()
    if (!previousOpenBranches) {
        return s.error(unexpectedGroupCloseMessage(s.r.unscanned))
    }
    parserState.mergeBranches(s)
    s.l.branches = previousOpenBranches
    return s
}
