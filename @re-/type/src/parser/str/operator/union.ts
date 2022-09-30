import type { Base } from "../../../nodes/base.js"
import { Union } from "../../../nodes/nonTerminal/nary/union.js"
import type { MissingRightOperandMessage, parserContext } from "../../common.js"
import type { Left } from "../state/left.js"
import type { OpenBranches } from "../state/openBranches.js"
import type { parserState } from "../state/state.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"

type PushRoot<B extends OpenBranches, Root> = {
    union: [
        OpenBranches.PushExpression<
            B["union"],
            OpenBranches.PushExpression<B["intersection"], Root>
        >,
        "|"
    ]
}

export const reduceUnion = (s: parserState.withPreconditionRoot) => {
    if (hasMergeableIntersection(s)) {
        mergeIntersection(s)
    }
    if (!s.l.branches.union) {
        s.l.branches.union = new Union.Node([s.l.root])
    } else {
        s.l.branches.union.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type ReduceUnion<
    L extends Left,
    Unscanned extends string
> = Unscanned extends ""
    ? MissingRightOperandMessage<"|">
    : Left.From<{
          lowerBound: L["lowerBound"]
          groups: L["groups"]
          branches: PushRoot<L["branches"], L["root"]>
          root: undefined
      }>

type stateWithMergeableUnion = parserState<{
    root: Base.node
    branches: { union: Union.Node }
}>

export const hasMergeableUnion = (
    s: parserState.withPreconditionRoot
): s is stateWithMergeableUnion => !!s.l.branches.union

export const mergeUnion = (s: stateWithMergeableUnion) => {
    s.l.branches.union.addMember(s.l.root)
    s.l.root = s.l.branches.union
    s.l.branches.union = undefined as any
    return s
}
