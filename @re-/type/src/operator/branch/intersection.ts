import { Node, Operator, Parser } from "../common.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    type PushRoot<B extends Branches.TypeState, Root> = {
        union: B["union"]
        intersection: [Branches.MergeExpression<B["intersection"], Root>, "&"]
    }

    export const reduce = (s: Operator.state, ctx: Node.context) => {
        if (!s.l.branches.intersection) {
            s.l.branches.intersection = new IntersectionNode([s.l.root], ctx)
        } else {
            s.l.branches.intersection.addMember(s.l.root)
        }
        s.l.root = undefined as any
        return s
    }

    export type Reduce<L extends Parser.Left> = Parser.Left.From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: PushRoot<L["branches"], L["root"]>
        root: undefined
    }>

    export type Mergeable = Parser.state<{
        root: Node.base
        branches: { intersection: IntersectionNode }
    }>

    export const isMergeable = (s: Parser.state): s is Mergeable =>
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

export class IntersectionNode extends Node.NonTerminal<Node.base[]> {
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
