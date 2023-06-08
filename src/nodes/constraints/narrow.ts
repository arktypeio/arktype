import { registry } from "../../compile/registry.js"
import type { Narrow } from "../../parse/ast/narrow.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { defineNodeKind } from "../node.js"

export const NarrowNode = defineNodeKind({
    kind: "narrow",
    compile: (rule: readonly Narrow[]) => {
        // Depending on type-guards, altering the order in which narrows run could
        // lead to a non-typsafe access, so they are preserved.
        // TODO:  Figure out how this needs to work with intersections
        const subconditions = rule.map((narrow) =>
            registry().register(narrow.name, narrow)
        )
        return subconditions.join(" && ")
    },
    intersect: intersectUniqueLists,
    describe: (narrows) => `narrowed by ${narrows.map((rule) => rule.name)}`
})

//     compileTraverse(s: CompilationState) {
//         return s.ifNotThen("false", s.problem("custom", "filters"))
//     }
