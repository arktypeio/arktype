import type { Narrow } from "../../parse/ast/narrow.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { defineNode } from "../node.js"
import { registry } from "../registry.js"

export const NarrowNode = defineNode<Narrow[]>()({
    kind: "narrow",
    condition: (rules) => {
        // Depending on type-guards, altering the order in which narrows run could
        // lead to a non-typsafe access, so they are preserved.
        // TODO:  Figure out how this needs to work with intersections
        return rules
            .map((narrow) => registry().register(narrow.name, narrow))
            .join(" && ")
    },
    describe: (rules) => {
        return `narrowed by ${rules.map((rule) => rule.name)}`
    },
    intersect: intersectUniqueLists
})

//     compileTraverse(s: CompilationState) {
//         return s.ifNotThen("false", s.problem("custom", "filters"))
//     }
