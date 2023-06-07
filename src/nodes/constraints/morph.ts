import { registry } from "../../compile/registry.js"
import type { Morph } from "../../parse/ast/morph.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import { BaseNode } from "../node.js"

export class MorphNode extends BaseNode<"morph"> {
    constructor(public rule: readonly Morph[]) {
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a|>b and b|>a are distinct and valid
        const subconditions = rule.map((morph) =>
            registry().register(morph.name, morph)
        )
        const condition = subconditions.join(" && ")
        if (BaseNode.nodes.morph[condition]) {
            return BaseNode.nodes.morph[condition]
        }
        super("morph", condition)
    }

    computeIntersection(other: MorphNode) {
        return new MorphNode(intersectUniqueLists(this.rule, other.rule))
    }

    toString() {
        return `morphed by ${this.rule.map((rule) => rule.name).join("|>")}`
    }
}

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen("false", s.problem("custom", "morphs"))
// }
