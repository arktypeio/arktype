import { Branches, MergeExpression } from "./branch.js"
import { Branch, branch, Node, Parser, strNode } from "./common.js"

type PushRoot<B extends Branches, Root> = {
    union: B["union"]
    intersection: [MergeExpression<B["intersection"], Root>, "&"]
}

export const reduceIntersection = (
    s: Parser.state.withRoot,
    ctx: Node.context
) => {
    if (!s.l.branches.intersection) {
        s.l.branches.intersection = new intersection([s.l.root], ctx)
    } else {
        s.l.branches.intersection.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type ReduceIntersection<L extends Parser.Left> = Parser.Left.From<{
    lowerBound: L["lowerBound"]
    groups: L["groups"]
    branches: PushRoot<L["branches"], L["root"]>
    root: undefined
}>

export type StateWithMergeableIntersection = Parser.state<{
    root: strNode
    branches: { intersection: intersection }
}>

export const hasMergeableIntersection = (
    s: Parser.state.withRoot
): s is StateWithMergeableIntersection => !!s.l.branches.intersection

export const mergeIntersection = (s: StateWithMergeableIntersection) => {
    s.l.branches.intersection.addMember(s.l.root)
    s.l.root = s.l.branches.intersection
    s.l.branches.intersection = undefined as any
    return s
}

export type Intersection<Left = unknown, Right = unknown> = Branch<
    Left,
    Right,
    "&"
>

export class intersection extends branch {
    addMember(node: strNode) {
        this.children.push(node)
    }

    token = "&" as const

    allows(args: Node.Allows.Args) {
        for (const branch of this.children) {
            if (!branch.allows(args)) {
                return false
            }
        }
        return true
    }

    create() {
        throw new Node.Create.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
