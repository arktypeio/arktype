import { TypeOfResult } from "@re-/tools"
import {
    Branch,
    branch,
    Node,
    Parser,
    strNode
} from "../../../nodes/types/nonTerminal/expression/branch/branch.js"
import { Branches, MergeExpression } from "./branch.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"

type PushRoot<B extends Branches, Root> = {
    union: [
        MergeExpression<B["union"], MergeExpression<B["intersection"], Root>>,
        "|"
    ]
}

export const reduceUnion = (s: Parser.state.withRoot, ctx: Nodes.context) => {
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

export type ReduceUnion<L extends Parser.Left> = Parser.Left.From<{
    lowerBound: L["lowerBound"]
    groups: L["groups"]
    branches: PushRoot<L["branches"], L["root"]>
    root: undefined
}>

export type StateWithMergeableUnion = Parser.state<{
    root: strNode
    branches: { union: union }
}>

export const hasMergeableUnion = (
    s: Parser.state.withRoot
): s is StateWithMergeableUnion => !!s.l.branches.union

export const mergeUnion = (s: StateWithMergeableUnion) => {
    s.l.branches.union.addMember(s.l.root)
    s.l.root = s.l.branches.union
    s.l.branches.union = undefined as any
    return s
}
