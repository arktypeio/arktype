import type { Narrow } from "../../parse/ast/narrow.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { BaseNode, defineNode } from "../node.js"
import { registry } from "../registry.js"

export const NarrowNode = defineNode(
    class NarrowNode extends BaseNode<Narrow[]> {
        readonly kind = "narrow"

        static compile(narrows: Narrow[]) {
            // Depending on type-guards, altering the order in which narrows run could
            // lead to a non-typsafe access, so they are preserved.
            // TODO:  Figure out how this needs to work with intersections
            return narrows.map((narrow) =>
                registry().register(narrow.name, narrow)
            )
        }

        computeIntersection(other: this) {
            return intersectUniqueLists(this.rule, other.rule)
        }

        describe() {
            return `narrowed by ${this.rule.map((rule) => rule.name)}`
        }
    }
)

//     compileTraverse(s: CompilationState) {
//         return s.ifNotThen("false", s.problem("custom", "filters"))
//     }
