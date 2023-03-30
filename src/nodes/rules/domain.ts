import type { Domain } from "../../utils/domains.ts"
import type { ComparisonState, Compilation, Disjoint } from "../node.ts"
import { Node } from "../node.ts"

export class DomainNode<domain extends Domain = any> extends Node<
    DomainNode<domain>,
    domain
> {
    serialize() {
        return this.definition
    }

    intersect(
        other: DomainNode,
        s: ComparisonState
    ): DomainNode<domain> | Disjoint {
        return this === other ? this : s.addDisjoint("domain", this, other)
    }

    compile(c: Compilation) {
        return this.definition === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.definition === "null" || this.definition === "undefined"
            ? `${c.data} === ${this.definition}`
            : `typeof ${c.data} === "${this.definition}"`
    }
}
