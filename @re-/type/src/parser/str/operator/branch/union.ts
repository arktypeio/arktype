import { UnionNode } from "../../../../nodes/branches/union.js"
import type { strNode } from "../../../../nodes/common.js"
import type { parserContext } from "../../../common.js"
import type { Left } from "../../state/left.js"
import type { parserState } from "../../state/state.js"
import type { Branches, MergeExpression } from "./branch.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"

type PushRoot<B extends Branches, Root> = {
    union: [
        MergeExpression<B["union"], MergeExpression<B["intersection"], Root>>,
        "|"
    ]
}

export const reduceUnion = (
    s: parserState.withRoot,
    context: parserContext
) => {
    if (hasMergeableIntersection(s)) {
        mergeIntersection(s)
    }
    if (!s.l.branches.union) {
        s.l.branches.union = new UnionNode([s.l.root], context)
    } else {
        s.l.branches.union.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type ReduceUnion<L extends Left> = Left.From<{
    lowerBound: L["lowerBound"]
    groups: L["groups"]
    branches: PushRoot<L["branches"], L["root"]>
    root: undefined
}>

export type stateWithMergeableUnion = parserState<{
    root: strNode
    branches: { union: UnionNode }
}>

export const hasMergeableUnion = (
    s: parserState.withRoot
): s is stateWithMergeableUnion => !!s.l.branches.union

export const mergeUnion = (s: stateWithMergeableUnion) => {
    s.l.branches.union.addMember(s.l.root)
    s.l.root = s.l.branches.union
    s.l.branches.union = undefined as any
    return s
}
