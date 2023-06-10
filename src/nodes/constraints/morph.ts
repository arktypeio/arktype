import { registry } from "../../compile/registry.js"
import type { Morph } from "../../parse/ast/morph.js"
import type { listable } from "../../utils/lists.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import type { Node } from "../node.js"
import { defineNodeKind } from "../node.js"

export interface MorphNode
    extends Node<{
        kind: "morph"
        rule: readonly Morph[]
        intersected: MorphNode
    }> {}

export const morphNode = defineNodeKind<MorphNode, listable<Morph>>(
    {
        kind: "morph",
        parse: listFrom,
        compile: (rule) => {
            // Avoid alphabetical sorting since morphs are non-commutative,
            // i.e. a|>b and b|>a are distinct and valid
            const subconditions = rule.map((morph) =>
                registry().register(morph.name, morph)
            )
            return subconditions.join(" && ")
        },
        intersect: (l, r): MorphNode =>
            morphNode(intersectUniqueLists(l.rule, r.rule))
    },
    (base) => ({
        description: `morphed by ${base.rule
            .map((morph) => morph.name)
            .join("|>")}`
    })
)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen("false", s.problem("custom", "morphs"))
// }
