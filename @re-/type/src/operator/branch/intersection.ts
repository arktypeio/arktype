import { Node } from "../../core.js"
import { Left, left, state } from "../../parser/index.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    type PushRoot<B extends Branches.TypeState, Root> = {
        union: B["union"]
        intersection: [Branches.MergeExpression<B["intersection"], Root>, "&"]
    }

    export const reduce = (s: state<left.withRoot>, ctx: Node.Context) => {
        if (!s.l.branches.intersection) {
            s.l.branches.intersection = new IntersectionNode([s.l.root], ctx)
        } else {
            s.l.branches.intersection.addMember(s.l.root)
        }
        s.l.root = undefined as any
        return s
    }

    export type Reduce<L extends Left.Base> = Left.From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: PushRoot<L["branches"], L["root"]>
        root: undefined
    }>

    export type Mergeable = state<{
        root: Node.node
        branches: { intersection: IntersectionNode }
    }>

    export const isMergeable = (s: state): s is Mergeable =>
        s.l.root !== undefined &&
        s.l.branches.intersection instanceof IntersectionNode

    export const merge = (s: Mergeable) => {
        s.l.branches.intersection.addMember(s.l.root)
        s.l.root = s.l.branches.intersection
        s.l.branches.intersection = undefined as any
        return s
    }

    export type Node<Left, Right> = [Left, "&", Right]
}

export class IntersectionNode extends Node.NonTerminal<Node.node[]> {
    addMember(node: Node.node) {
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
