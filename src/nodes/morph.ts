import type { Morph } from "../parse/ast/morph.js"
import type { listable } from "../utils/lists.js"
import { intersectUniqueLists, listFrom } from "../utils/lists.js"
import type { CompilationState } from "./compilation.js"
import { Node } from "./node.js"

export class MorphNode extends Node<"morph"> {
    static readonly kind = "morph"

    transformations: readonly Morph[]

    constructor(transformations: listable<Morph>) {
        const transformationList = listFrom(transformations)
        super(MorphNode, transformationList)
        this.transformations = transformationList
    }

    static compile(transformations: readonly Morph[]) {
        return "false"
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.key, s.problem("custom", "morphs"))
    }

    static intersect(l: MorphNode, r: MorphNode) {
        return new MorphNode(
            intersectUniqueLists(l.transformations, r.transformations)
        )
    }
}
