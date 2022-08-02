import { Base } from "../../base/index.js"
import { ParserState } from "../../parser/state.js"
import { NonTerminal } from "./../nonTerminal.js"
import { Branches } from "./branch.js"

export namespace Intersection {
    type ReduceTree<T extends ParserState.Tree> = {
        root: ""
        union: T["union"]
        intersection: [
            T["intersection"] extends []
                ? T["root"]
                : [...T["intersection"], T["root"]],
            "&"
        ]
    }

    export type Parse<S extends ParserState.State, Dict> = Branches.Parse<
        S,
        ReduceTree<S["L"]["tree"]>,
        Dict
    >

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
