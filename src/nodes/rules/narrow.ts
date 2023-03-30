import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain } from "../../utils/domains.ts"
import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { intersectUniqueLists } from "./rule.ts"

export class NarrowNode<domain extends Domain = any> extends Node<
    NarrowNode,
    Narrow[]
> {
    serialize() {
        // TODO: fix
        return this.definition
            .map((_) => String(_))
            .sort()
            .join()
    }

    intersect(other: NarrowNode<domain>) {
        return new NarrowNode(
            intersectUniqueLists(this.definition, other.definition)
        )
    }

    compile(c: Compilation) {
        return c.check("custom", this.id, this.id)
    }
}
