import type { Narrow } from "../../parse/ast/narrow.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { BaseNode } from "../node.js"
import { registry } from "../registry.js"

export class NarrowNode extends BaseNode<"narrow"> {
    constructor(public rule: readonly Narrow[]) {
        // Depending on type-guards, altering the order in which narrows run could
        // lead to a non-typsafe access, so they are preserved.
        // TODO:  Figure out how this needs to work with intersections
        const subconditions = rule.map((narrow) =>
            registry().register(narrow.name, narrow)
        )
        const condition = subconditions.join(" && ")
        if (BaseNode.nodes.narrow[condition]) {
            return BaseNode.nodes.narrow[condition]
        }
        super("narrow", condition)
    }

    computeIntersection(other: NarrowNode) {
        return new NarrowNode(intersectUniqueLists(this.rule, other.rule))
    }

    toString() {
        return `narrowed by ${this.rule.map((rule) => rule.name)}`
    }
}

//     compileTraverse(s: CompilationState) {
//         return s.ifNotThen("false", s.problem("custom", "filters"))
//     }
