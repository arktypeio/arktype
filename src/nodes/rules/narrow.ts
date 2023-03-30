import type { Narrow } from "../../parse/ast/narrow.ts"
import type { Domain } from "../../utils/domains.ts"
import type { Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { intersectUniqueLists } from "./rule.ts"

export class NarrowRule<domain extends Domain = any> extends Node<
    NarrowRule,
    Narrow[]
> {
    serialize() {
        // TODO: fix
        return this.definition
            .map((_) => String(_))
            .sort()
            .join()
    }

    intersect(other: NarrowRule<domain>) {
        return new NarrowRule(
            intersectUniqueLists(this.definition, other.definition)
        )
    }

    compile(c: Compilation) {
        return c.check("custom", this.id, this.id)
    }
}
