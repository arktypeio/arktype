import { Base } from "../../../nodes/base.js"
import { union } from "../../../nodes/types/nonTerminal/expression/branch/union.js"
import { strNode } from "../../common.js"
import { Left } from "../../parser/left.js"
import { parserState } from "../../parser/state.js"
import { Branches, MergeExpression } from "./branch.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"

type PushRoot<B extends Branches, Root> = {
    union: [
        MergeExpression<B["union"], MergeExpression<B["intersection"], Root>>,
        "|"
    ]
}

export const reduceUnion = (s: parserState.withRoot, ctx: Base.context) => {
    if (hasMergeableIntersection(s)) {
        mergeIntersection(s)
    }
    if (!s.l.branches.union) {
        s.l.branches.union = new union([s.l.root], ctx)
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
    branches: { union: union }
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
