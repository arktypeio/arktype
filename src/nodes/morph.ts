import type { Morph } from "../parse/ast/morph.js"
import { intersectUniqueLists, listFrom } from "../utils/generics.js"
import type { CompilationState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export class MorphNode extends Node<typeof MorphNode> {
    static readonly kind = "morph"

    transformations: readonly Morph[]

    constructor(transformations: Morph | Morph[]) {
        const transformationList = listFrom(transformations)
        super(MorphNode, transformationList)
        this.transformations = transformationList
    }

    static compile(transformations: readonly Morph[]): CompiledAssertion {
        return `data !== data`
    }

    compileTraversal(s: CompilationState) {
        return s.ifNotThen(this.key, s.problem("custom", "morphs"))
    }

    intersect(other: MorphNode) {
        return new MorphNode(
            intersectUniqueLists(this.transformations, other.transformations)
        )
    }
}
