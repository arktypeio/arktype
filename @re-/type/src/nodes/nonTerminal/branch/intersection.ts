import { Base } from "../../base/index.js"
import { Left, State } from "../../parser/index.js"
import { NonTerminal } from "./../nonTerminal.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    type PushRoot<B extends Branches.TypeState, Root> = {
        union: B["union"]
        intersection: [Branches.MergeExpression<B["intersection"], Root>, "&"]
    }

    export const reduce = (s: State.WithRoot, ctx: Base.Parsing.Context) => {
        if (!s.l.branches.intersection) {
            s.l.branches.intersection = new IntersectionNode([s.l.root], ctx)
        } else {
            s.l.branches.intersection.addMember(s.l.root)
        }
        s.l.root = undefined as any
        return s
    }

    export type Reduce<L extends Left.T.Base> = Left.From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: PushRoot<L["branches"], L["root"]>
        root: undefined
    }>

    export type Mergeable = State.With<{
        l: { root: Base.Node; branches: { intersection: IntersectionNode } }
    }>

    export const isMergeable = (s: State.V): s is Mergeable =>
        s.l.root !== undefined &&
        s.l.branches.intersection instanceof IntersectionNode

    export const merge = (s: Mergeable) => {
        s.l.branches.intersection.addMember(s.l.root)
        s.l.root = s.l.branches.intersection
        s.l.branches.intersection = undefined as any
        return s
    }
}

export class IntersectionNode extends NonTerminal<Base.Node[]> {
    addMember(node: Base.Node) {
        this.children.push(node)
    }

    toString() {
        return this.children.map((_) => _.toString()).join("&")
    }

    allows(args: Base.Validation.Args) {
        for (const branch of this.children) {
            if (!branch.allows(args)) {
                return false
            }
        }
        return true
    }

    generate() {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "Intersection generation is unsupported."
        )
    }
}
