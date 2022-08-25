import { Node, Operator } from "../common.js"
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

export type BranchToken = "|" | "&"

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

export abstract class branch extends Node.base {
    constructor(protected children: Node.base[], protected ctx: Node.context) {
        super()
    }

    abstract token: BranchToken

    get tree() {
        let tree = this.children[this.children.length - 1].tree
        for (let i = this.children.length - 2; i >= 0; i--) {
            tree = [this.children[i].tree, this.token, tree]
        }
        return tree as Operator.Tree
    }

    toString() {
        return this.children.flatMap((_) => _.tree).join("")
    }

    collectReferences(
        opts: Node.References.Options,
        collected: Node.References.Collection
    ) {
        for (const child of this.children) {
            child.collectReferences(opts, collected)
        }
    }
}
