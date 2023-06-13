import { registry } from "../../compile/registry.js"
import type { Narrow } from "../../parse/ast/narrow.js"
import type { listable } from "../../../dev/utils/lists.js"
import { intersectUniqueLists, listFrom } from "../../../dev/utils/lists.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export interface NarrowNode extends BaseNode<readonly Narrow[]> { }

export const narrowNode = defineNodeKind<NarrowNode, listable<Narrow>>(
    {
        kind: "narrow",
        // Depending on type-guards, altering the order in which narrows run could
        // lead to a non-typsafe access, so they are preserved.
        // TODO:  Figure out how this needs to work with intersections
        parse: listFrom,
        compile: (rule) =>
            rule.map((narrow) => registry().register(narrow.name, narrow)),
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
