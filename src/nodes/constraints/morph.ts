import type { Morph } from "../../parse/ast/morph.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import type { CompilationState } from "../compilation.js"
import { defineNode, Node } from "../node.js"
import { registry } from "../registry.js"

export const MorphNode = defineNode<Morph[]>({
    kind: "morph",
    condition: (rules) => {
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a|>b and b|>a are distinct and valid
        return rules
            .map((morph) => registry().register(morph.name, morph))
            .join(" && ")
    },
    describe: (rules) => {
        return `morphed by ${rules.map((rule) => rule.name).join("|>")}`
    },
    intersect: intersectUniqueLists
})

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen("false", s.problem("custom", "morphs"))
// }
