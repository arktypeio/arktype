import type { IntersectionNode } from "../../../../nodes/nonTerminal/nary/intersection.js"
import type { UnionNode } from "../../../../nodes/nonTerminal/nary/union.js"
import type { parserState } from "../../state/state.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"
import { hasMergeableUnion, mergeUnion } from "./union.js"

export type branches = {
    union?: UnionNode
    intersection?: IntersectionNode
}

export type BranchToken = "|" | "&"

export type Branches = {
    union?: OpenBranch<"|">
    intersection?: OpenBranch<"&">
}

export type OpenBranch<Token extends BranchToken = BranchToken> = [
    unknown,
    Token
]

export type MergeBranches<B extends Branches, Root> = MergeExpression<
    B["union"],
    MergeExpression<B["intersection"], Root>
>

export const mergeBranches = (s: parserState.withRoot) => {
    if (hasMergeableIntersection(s)) {
        mergeIntersection(s)
    }
    if (hasMergeableUnion(s)) {
        mergeUnion(s)
    }
    return s
}

export type MergeExpression<
    B extends OpenBranch | undefined,
    Expression
> = B extends OpenBranch ? [...B, Expression] : Expression
