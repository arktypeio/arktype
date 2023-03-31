import type { Domain } from "../../utils/domains.ts"
import type { ComparisonState, Compilation, Disjoint } from "../node.ts"
import { Node } from "../node.ts"

export class DomainNode<domain extends Domain = any> extends Node<
    DomainNode<domain>
> {
    constructor(public readonly children: domain) {
        super(children)
    }

    intersect(
        other: DomainNode,
        s: ComparisonState
    ): DomainNode<domain> | Disjoint {
        return this === other ? this : s.addDisjoint("domain", this, other)
    }

    compile(c: Compilation) {
        return this.children === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.children === "null" || this.children === "undefined"
            ? `${c.data} === ${this.children}`
            : `typeof ${c.data} === "${this.children}"`
    }
}
