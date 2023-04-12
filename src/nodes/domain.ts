import type { Domain } from "../utils/domains.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Node } from "./node.js"

export class DomainNode<domain extends Domain = Domain> extends Node<
    typeof DomainNode
> {
    constructor(domain: domain) {
        super(DomainNode, domain)
    }

    intersect(other: DomainNode, s: ComparisonState) {
        return this.child === other.child
            ? this
            : s.addDisjoint("domain", this, other)
    }

    static checks(constraint: Domain, s: CompilationState) {
        return [
            constraint === "object"
                ? `((typeof ${s.data} === "object" && ${s.data} !== null) || typeof ${s.data} === "function")`
                : constraint === "null" || constraint === "undefined"
                ? `${s.data} === ${constraint}`
                : `typeof ${s.data} === "${constraint}"`
        ]
    }
}
