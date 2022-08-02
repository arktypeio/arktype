import { Base } from "../../base/index.js"
import { ParserState } from "../../parser/state.js"
import { NonTerminal } from "./../nonTerminal.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    export type ReduceBranches<B extends Branches.State, Expression> = {
        union: B["union"]
        intersection: [
            B["intersection"] extends []
                ? Expression
                : [...B["intersection"], Expression],
            "&"
        ]
    }

    export type Parse<S extends ParserState.State, Dict> = Branches.ParseToken<
        S,
        ReduceBranches<S["L"]["branches"], S["L"]["expression"]>,
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
