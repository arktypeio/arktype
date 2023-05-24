import type { Morph } from "../../parse/ast/morph.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { BaseNode } from "../node.js"
import { registry } from "../registry.js"

export class MorphNode extends BaseNode<typeof MorphNode> {
    static readonly kind = "morph"

    static compile(morphs: Morph[]) {
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a|>b and b|>a are distinct and valid
        return morphs.map((morph) => registry().register(morph.name, morph))
    }

    computeIntersection(other: MorphNode) {
        return new MorphNode(intersectUniqueLists(this.rule, other.rule))
    }

    describe() {
        return `morphed by ${this.rule.map((rule) => rule.name).join("|>")}`
    }
}

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen("false", s.problem("custom", "morphs"))
// }
