import type { Domain } from "../../utils/domains.ts"
import { RuleNode } from "../branch.ts"
import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"

export class DomainNode extends RuleNode<Domain, DomainNode> {
    compare(r: DomainNode, s: ComparisonState): Comparison<DomainNode> {
        return this.rule === r.rule
            ? s.equality(this)
            : s.disjoint("domain", this.rule, r.rule)
    }

    compile(c: Compilation) {
        return this.rule === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.rule === "null" || this.rule === "undefined"
            ? `${c.data} === ${this.rule}`
            : `typeof ${c.data} === "${this.rule}"`
    }
}
