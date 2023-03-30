import type { Domain } from "../../utils/domains.ts"
import type { ComparisonState, Compilation, Disjoint } from "../node.ts"
import { Rule } from "./rule.ts"

export class DomainRule<domain extends Domain = any> extends Rule<"domain"> {
    constructor(public domain: domain) {
        super("domain", domain)
    }

    intersect(
        other: DomainRule,
        s: ComparisonState
    ): DomainRule<domain> | Disjoint {
        return this === other ? this : s.addDisjoint("domain", this, other)
    }

    compile(c: Compilation) {
        return this.domain === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.domain === "null" || this.domain === "undefined"
            ? `${c.data} === ${this.domain}`
            : `typeof ${c.data} === "${this.domain}"`
    }
}
