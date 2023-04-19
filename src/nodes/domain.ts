import type { Domain } from "../utils/domains.js"
import type { ComparisonState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export type NonEnumerableDomain = Exclude<
    Domain,
    "undefined" | "null" | "boolean"
>

export class DomainNode<
    domain extends NonEnumerableDomain = NonEnumerableDomain
> extends Node<typeof DomainNode> {
    constructor(domain: domain) {
        super(DomainNode, domain)
    }

    intersect(other: DomainNode, s: ComparisonState) {
        return this.child === other.child
            ? this
            : s.addDisjoint("domain", this, other)
    }

    static compile(domain: NonEnumerableDomain): CompiledAssertion {
        return domain === "object"
            ? `((typeof data !== "object" || data === null) && typeof data !== "function")`
            : `typeof data !== "${domain}"`
    }
}
