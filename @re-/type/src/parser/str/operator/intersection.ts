import type { Base } from "../../../nodes/base.js"
import type { MissingRightOperandMessage, parserContext } from "../../common.js"
import type { Left } from "../state/left.js"
import type { parserState } from "../state/state.js"

type PushRoot<B extends Branches, Root> = {
    union: B["union"]
    intersection: [MergeExpression<B["intersection"], Root>, "&"]
}

export const reduceIntersection = (
    s: parserState.withPreconditionRoot,
    context: parserContext
) => {
    if (!s.l.branches.intersection) {
        s.l.branches.intersection = new IntersectionNode([s.l.root], context)
    } else {
        s.l.branches.intersection.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type ReduceIntersection<
    L extends Left,
    Unscanned extends string
> = Unscanned extends ""
    ? MissingRightOperandMessage<"&">
    : Left.From<{
          lowerBound: L["lowerBound"]
          groups: L["groups"]
          branches: PushRoot<L["branches"], L["root"]>
          root: undefined
      }>

export type stateWithMergeableIntersection = parserState<{
    root: Base.node
    branches: { intersection: IntersectionNode }
}>

export const hasMergeableIntersection = (
    s: parserState.withPreconditionRoot
): s is stateWithMergeableIntersection => !!s.l.branches.intersection

export const mergeIntersection = (s: stateWithMergeableIntersection) => {
    s.l.branches.intersection.addMember(s.l.root)
    s.l.root = s.l.branches.intersection
    s.l.branches.intersection = undefined as any
    return s
}
