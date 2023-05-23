import type { Narrow } from "../../parse/ast/narrow.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { defineNode } from "../node.js"
import { registry } from "../registry.js"

export const NarrowNode = defineNode(
    (rules: Narrow[]) => {
        // Depending on type-guards, altering the order in which narrows run could
        // lead to a non-typsafe access, so they are preserved.
        // TODO:  Figure out how this needs to work with intersections
        return rules.map((narrow) => registry().register(narrow.name, narrow))
    },
    intersectUniqueLists,
    (base) =>
        class NarrowNode extends base {
            readonly kind = "narrow"

            describe() {
                return `narrowed by ${this.rule.map((rule) => rule.name)}`
            }
        }
)
// })
// kind: "narrow",
// condition: ,
// describe: (rules) => {
//     return `narrowed by ${rules.map((rule) => rule.name)}`
// },
// intersect:

//     compileTraverse(s: CompilationState) {
//         return s.ifNotThen("false", s.problem("custom", "filters"))
//     }
