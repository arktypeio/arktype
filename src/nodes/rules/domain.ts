import type { Domain } from "../../utils/domains.ts"
import type { ComparisonState, Compilation, Disjoint } from "../node.ts"
import { Node } from "../node.ts"

export class DomainRule<domain extends Domain = any> extends Node<
    DomainRule<domain>,
    domain
> {
    serialize() {
        return this.definition
    }

    intersect(
        other: DomainRule,
        s: ComparisonState
    ): DomainRule<domain> | Disjoint {
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
