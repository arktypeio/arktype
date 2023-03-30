import type { Morph } from "../../parse/ast/morph.ts"
import { intersectUniqueLists } from "../../utils/generics.ts"
import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"

export class MorphNode extends Node<MorphNode> {
    constructor(public definition: Morph[]) {
        super("TODO")
    }

    intersect(other: MorphNode) {
        return new MorphNode(
            intersectUniqueLists(this.definition, other.definition)
        )
    }

    compile(c: Compilation): string {
        return c.data
    }
}
