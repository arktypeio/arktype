import type { Morph } from "../../parse/ast/morph.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { defineNode } from "../node.js"
import { registry } from "../registry.js"

export const MorphNode = defineNode(
    (morphs: Morph[]) => {
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a|>b and b|>a are distinct and valid
        return morphs.map((morph) => registry().register(morph.name, morph))
    },
    intersectUniqueLists,
    (base) =>
        class MorphNode extends base {
            readonly kind = "morph"

            describe() {
                return `morphed by ${this.rule
                    .map((rule) => rule.name)
                    .join("|>")}`
            }
        }
)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen("false", s.problem("custom", "morphs"))
// }
