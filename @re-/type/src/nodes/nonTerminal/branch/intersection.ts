import { Base } from "../../base/index.js"
import { ParserType } from "../../parser.js"
import { NonTerminal } from "./../nonTerminal.js"
import { Branches } from "./branch.js"

export namespace IntersectionType {
    export type ReduceBranches<B extends Branches.State, Expression> = {
        union: B["union"]
        intersection: [
            B["intersection"] extends []
                ? Expression
                : [...B["intersection"], Expression],
            "&"
        ]
    }

    export type Parse<S extends ParserType.State, Dict> = Branches.ParseToken<
        S,
        ReduceBranches<S["L"]["branch"], S["L"]["expression"]>,
        Dict
    >
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
