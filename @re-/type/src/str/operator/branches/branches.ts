import { BranchToken, Operator } from "./common.js"
import {
    hasMergeableIntersection,
    intersection,
    mergeIntersection
} from "./intersection.js"
import { hasMergeableUnion, mergeUnion, union } from "./union.js"

export type branches = {
    union?: union
    intersection?: intersection
}

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

export const mergeBranches = (s: Operator.state) => {
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
