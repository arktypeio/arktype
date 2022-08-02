import { Base } from "../../base/index.js"
import { ParserState } from "../../parser/state.js"
import { NonTerminal } from "./../nonTerminal.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    type PushRoot<B extends Branches.State, Root> = {
        union: B["union"]
        intersection: [Branches.MergeExpression<B["intersection"], Root>, "&"]
    }

    export type Parse<S extends ParserState.State, Dict> = Branches.Parse<
        S,
        PushRoot<S["L"]["branches"], S["L"]["root"]>,
        Dict
    >

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
