import { registry } from "../../compile/registry.js"
import type { Narrow } from "../../parse/ast/narrow.js"
import type { listable } from "../../utils/lists.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export const thisNarrow = () => true

export interface NarrowNode extends BaseNode<readonly Narrow[]> {}

export const narrowNode = defineNodeKind<NarrowNode, listable<Narrow>>(
    {
        kind: "narrow",
        // Depending on type-guards, altering the order in which narrows run could
        // lead to a non-typsafe access, so they are preserved.
        // TODO:  Figure out how this needs to work with intersections
        parse: listFrom,
        compile: (rule, s) =>
            rule
                .map((narrow) => {
                    const name =
                        narrow === thisNarrow
                            ? // the name assigned to a CompiledFunction, allowing it to recurse
                              "self"
                            : registry().register("narrow", narrow.name, narrow)
                    return s.check("custom", "?", `${name}(${s.data})`)
                })
                .join("\n"),
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
