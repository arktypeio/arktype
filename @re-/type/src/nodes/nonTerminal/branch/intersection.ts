import { Base } from "../../base/index.js"
import { State } from "../../parser/index.js"
import { Lexer } from "../../parser/lexer.js"
import { NonTerminal } from "./../nonTerminal.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    type PushRoot<B extends Branches.TypeState, Root> = {
        union: B["union"]
        intersection: [Branches.MergeExpression<B["intersection"], Root>, "&"]
    }

    export type Reduce<Tree extends State.Tree> = State.TreeFrom<{
        bounds: Tree["bounds"]
        groups: Tree["groups"]
        branches: PushRoot<Tree["branches"], Tree["root"]>
        root: undefined
    }>

    export const parse = (s: State.Value, ctx: Base.Parsing.Context) => {
        if (!s.branches.intersection) {
            s.branches.intersection = new IntersectionNode([s.root!], ctx)
        } else {
            s.branches.intersection.addMember(s.root!)
        }
        s.root = undefined
        Lexer.shiftBase(s.scanner)
    }

    export const merge = (s: State.Value) => {
        if (s.branches.intersection) {
            s.branches.intersection.addMember(s.root!)
            s.root = s.branches.intersection
            s.branches.intersection = undefined
        }
    }

    export type Node<Left, Right> = [Left, "&", Right]
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
