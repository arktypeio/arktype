import type { strNode } from "../../../../nodes/common.js"
import { intersection } from "../../../../nodes/expressions/branches/intersection.js"
import type { parseContext } from "../../../common.js"
import type { Left } from "../../state/left.js"
import type { parserState } from "../../state/state.js"
import type { Branches, MergeExpression } from "./branch.js"

type PushRoot<B extends Branches, Root> = {
    union: B["union"]
    intersection: [MergeExpression<B["intersection"], Root>, "&"]
}

export const reduceIntersection = (
    s: parserState.withRoot,
    ctx: parseContext
) => {
    if (!s.l.branches.intersection) {
        s.l.branches.intersection = new intersection([s.l.root], ctx)
    } else {
        s.l.branches.intersection.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type ReduceIntersection<L extends Left> = Left.From<{
    lowerBound: L["lowerBound"]
    groups: L["groups"]
    branches: PushRoot<L["branches"], L["root"]>
    root: undefined
}>

export type stateWithMergeableIntersection = parserState<{
    root: strNode
    branches: { intersection: intersection }
}>

export const hasMergeableIntersection = (
    s: parserState.withRoot
): s is stateWithMergeableIntersection => !!s.l.branches.intersection

export const mergeIntersection = (s: stateWithMergeableIntersection) => {
    s.l.branches.intersection.addMember(s.l.root)
    s.l.root = s.l.branches.intersection
    s.l.branches.intersection = undefined as any
    return s
}
