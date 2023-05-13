import type { Morph } from "../../parse/ast/morph.js"
import { intersectUniqueLists } from "../../utils/lists.js"
import type { CompilationState } from "../compilation.js"
import { Node } from "../node.js"

export class MorphNode extends Node<"morph"> {
    constructor(public children: Morph[]) {
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a|>b and b|>a are distinct and valid
        // const registeredNames morphs.map((morph) => registry().register(morph.name, morph))
        super("morph", "false")
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
