import { Base } from "../../base/index.js"
import { Expression } from "../../parser/expression.js"
import { Lexer } from "../../parser/lexer.js"
import { NonTerminal } from "./../nonTerminal.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    type Push<B extends Branches.TypeState, Root> = {
        union: B["union"]
        intersection: [...B["intersection"], Root]
    }

    export type Merge<
        B extends Branches.TypeState,
        Root
    > = B["intersection"] extends [] ? Root : ["&", ...B["intersection"], Root]

    export type Parse<S extends Expression.State.Type> = Branches.Parse<
        S,
        Push<S["branches"], S["root"]>
    >

    export const parse = (
        s: Expression.State.Value,
        ctx: Base.Parsing.Context
    ) => {
        if (!s.branches.intersection) {
            s.branches.intersection = new IntersectionNode([s.root!], ctx)
        } else {
            s.branches.intersection.addMember(s.root!)
        }
        s.root = undefined
        Lexer.shiftBase(s.scanner)
    }

    export const merge = (s: Expression.State.Value) => {
        if (s.branches.intersection) {
            s.branches.intersection.addMember(s.root!)
            s.root = s.branches.intersection
            s.branches.intersection = undefined
        }
    }

    export type Node<Left = unknown, Right = unknown> = [Left, "&", Right]
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
