import { Node, Operator, Parser } from "../common.js"
import { BranchState, MergeExpression } from "./branch.js"

type PushRoot<B extends BranchState, Root> = {
    union: B["union"]
    intersection: [MergeExpression<B["intersection"], Root>, "&"]
}

export const reduceIntersection = (s: Operator.state, ctx: Node.context) => {
    if (!s.l.branches.intersection) {
        s.l.branches.intersection = new intersection([s.l.root], ctx)
    } else {
        s.l.branches.intersection.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type ReduceIntersection<L extends Parser.Left> = Parser.Left.From<{
    bounds: L["bounds"]
    groups: L["groups"]
    branches: PushRoot<L["branches"], L["root"]>
    root: undefined
}>

export type StateWithMergeableIntersection = Parser.state<{
    root: Node.base
    branches: { intersection: intersection }
}>

export const hasMergeableIntersection = (
    s: Parser.state
): s is StateWithMergeableIntersection =>
    s.l.root !== undefined && s.l.branches.intersection !== undefined

export const mergeIntersection = (s: StateWithMergeableIntersection) => {
    s.l.branches.intersection.addMember(s.l.root)
    s.l.root = s.l.branches.intersection
    s.l.branches.intersection = undefined as any
    return s
}

export type Intersection<Left = undefined, Right = undefined> = [
    Left,
    "&",
    Right
]

export class intersection extends Node.NonTerminal<Node.base[]> {
    addMember(node: Node.base) {
        this.children.push(node)
    }

    toString() {
        return this.children.map((_) => _.toString()).join("&")
    }

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
