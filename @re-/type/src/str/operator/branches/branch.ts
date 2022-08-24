import { Operator } from "../common.js"
import {
    hasMergeableIntersection,
    intersection,
    mergeIntersection
} from "./intersection.js"
import { hasMergeableUnion, mergeUnion, union } from "./union.js"

export type OpenBranch = [unknown, "|" | "&"]

export type BranchState = {
    union?: OpenBranch
    intersection?: OpenBranch
}

export type branchState = {
    union?: union
    intersection?: intersection
}

export type MergeAll<B extends BranchState, Root> = MergeExpression<
    B["union"],
    MergeExpression<B["intersection"], Root>
>

export const mergeAll = (s: Operator.state) => {
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
