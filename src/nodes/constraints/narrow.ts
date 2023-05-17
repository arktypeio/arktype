import type { DynamicNarrow } from "../../parse/ast/narrow.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import type { CompilationState } from "../compilation.js"
import { defineNode, Node } from "../node.js"
import { registry } from "../registry.js"

export const Regex = defineNode<DynamicNarrow[]>({
    kind: "regex",
    condition: (sources) =>
        sources.map(compileExpression).sort().join(" && ") ?? "true",
    describe: (sources) => {
        const literals = sources.map((_) => `/${_}/`)
        return literals.length === 1
            ? literals[0]
            : `expressions ${literals.join(", ")}`
    },
    intersect: intersectUniqueLists
})

export class NarrowNode extends Node<"narrow"> {
    //     // Depending on type-guards, altering the order in which narrows run could
    //     // lead to a non-typsafe access, so they are preserved.
    //     // TODO:  Figure out how this needs to work with intersections
    // constructor(public children: readonly Narrow[]) {

    //     const registeredNames = children.map((narrow) =>
    //         registry().register(narrow.name, narrow)
    //     )
    //     super("narrow", "false")
    // }

    readonly subclass = NarrowNode

    static readonly kind = "narrow"

    static compile(children: readonly DynamicNarrow[]) {
        return children
            .map((narrow) => registry().register(narrow.name, narrow))
            .join(" && ")
    }

    toString() {
        // TODO: Names
        return `narrow ${this.condition}`
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen("false", s.problem("custom", "filters"))
    }

    intersectNode(other: NarrowNode) {
        return new NarrowNode(
            intersectUniqueLists(this.children, other.children)
        )
    }
}
