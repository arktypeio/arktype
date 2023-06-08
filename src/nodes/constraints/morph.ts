import { registry } from "../../compile/registry.js"
import type { Morph } from "../../parse/ast/morph.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { defineNodeKind } from "../node.js"

export const MorphNode = defineNodeKind({
    kind: "morph",
    compile: (rule: readonly Morph[]) => {
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a|>b and b|>a are distinct and valid
        const subconditions = rule.map((morph) =>
            registry().register(morph.name, morph)
        )
        return subconditions.join(" && ")
    },
    intersect: (l, r) => intersectUniqueLists(l.rule, r.rule),
    describe: (node) =>
        `morphed by ${node.rule.map((morph) => morph.name).join("|>")}`
})

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen("false", s.problem("custom", "morphs"))
// }
