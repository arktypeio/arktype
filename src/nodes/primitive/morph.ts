import { registry } from "../../compile/registry.js"
import type { Morph } from "../../parse/ast/morph.js"
import type { listable } from "../../utils/lists.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import { defineNodeKind } from "../node.js"
import type { PrimitiveNode } from "./primitive.js"

export interface MorphNode extends PrimitiveNode<readonly Morph[]> {}

export const morphNode = defineNodeKind<MorphNode, listable<Morph>>(
    {
        kind: "morph",
        parse: listFrom,
        compile: (rule) => ({
            precedence: "morph",
            // Avoid alphabetical sorting since morphs are non-commutative,
            // i.e. a|>b and b|>a are distinct and valid
            condition: rule
                .map((morph) => registry().register(morph.name, morph))
                .join(" && ")
        }),
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
