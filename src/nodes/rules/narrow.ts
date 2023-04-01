import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain } from "../../utils/domains.ts"
import { intersectUniqueLists } from "../../utils/generics.ts"
import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"

export class NarrowNode<domain extends Domain = any> extends Node<NarrowNode> {
    constructor(public readonly children: Narrow[]) {
        super(children.map(() => "TODO").join())
    }

    intersect(other: NarrowNode<domain>) {
        return new NarrowNode(
            intersectUniqueLists(this.children, other.children)
        )
    }

    compile(c: Compilation) {
        return c.check("custom", this.compiled, this.compiled)
    }
}
