import { registry } from "../../compile/registry.js"
import type { Narrow } from "../../parse/ast/narrow.js"
import type { listable } from "../../utils/lists.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import type { Node } from "../node.js"
import { defineNodeKind } from "../node.js"

export interface NarrowNode
    extends Node<{
        kind: "narrow"
        rule: readonly Narrow[]
        intersected: NarrowNode
    }> {}

export const narrowNode = defineNodeKind<NarrowNode, listable<Narrow>>(
    {
        kind: "narrow",
        parse: listFrom,
        compile: (rule) => {
            // Depending on type-guards, altering the order in which narrows run could
            // lead to a non-typsafe access, so they are preserved.
            // TODO:  Figure out how this needs to work with intersections
            return {
                precedence: "narrow",
                condition: rule
                    .map((narrow) => registry().register(narrow.name, narrow))
                    .join(" && ")
            }
        },
        intersect: (l, r): NarrowNode =>
            narrowNode(intersectUniqueLists(l.rule, r.rule))
    },
    (base) => ({
        description: `narrowed by ${base.rule.map((narrow) => narrow.name)}`
    })
)

//     compileTraverse(s: CompilationState) {
//         return s.ifNotThen("false", s.problem("custom", "filters"))
//     }
