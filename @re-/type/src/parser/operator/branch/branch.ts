import { intersection } from "../../../nodes/types/nonTerminal/expression/branch/intersection.js"
import { union } from "../../../nodes/types/nonTerminal/expression/branch/union.js"
import { parserState } from "../../parser/state.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"
import { hasMergeableUnion, mergeUnion } from "./union.js"

export type branches = {
    union?: union
    intersection?: intersection
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
