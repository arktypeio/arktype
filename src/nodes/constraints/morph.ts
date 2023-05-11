import type { Morph } from "../../parse/ast/morph.js"
import type { listable } from "../../utils/lists.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import type { CompilationState } from "../compilation.js"
import { Node } from "../node.js"

export class MorphNode extends Node<"morph"> {
    static readonly kind = "morph"

    transformations: readonly Morph[]

    constructor(transformations: listable<Morph>) {
        const transformationList = listFrom(transformations)
        super("morph", MorphNode.compile(transformationList))
        this.transformations = transformationList
    }

    static compile(transformations: readonly Morph[]) {
        return "false"
    }

    toString() {
        const names = this.transformations.map((morph) => morph.name)
        return names.length === 1
            ? `morph ${names[0]}`
            : `morphs ${names.join("=>")}`
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("custom", "morphs"))
    }

    intersectNode(r: MorphNode) {
        return new MorphNode(
            intersectUniqueLists(this.transformations, r.transformations)
        )
    }
}
