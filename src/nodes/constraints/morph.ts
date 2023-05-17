import type { MorphImplementation } from "../../parse/ast/morph.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import type { CompilationState } from "../compilation.js"
import { Node } from "../node.js"
import { registry } from "../registry.js"

export class MorphNode extends Node<"morph"> {
    // constructor(public children: readonly Morph[]) {

    //     super("morph", "false")
    // }

    readonly subclass = MorphNode

    static readonly kind = "morph"

    static compile(children: readonly MorphImplementation[]) {
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a|>b and b|>a are distinct and valid
        return children
            .map((morph) => registry().register(morph.name, morph))
            .join(" && ")
    }

    toString() {
        // TODO: Names
        return `morph ${this.condition}`
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen("false", s.problem("custom", "morphs"))
    }

    intersectNode(r: MorphNode) {
        return new MorphNode(intersectUniqueLists(this.children, r.children))
    }
}
