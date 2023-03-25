import type { Domain, inferDomain } from "../../utils/domains.ts"
import type { constructor } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"
import { RuleNode } from "./rule.ts"

export type BaseRule<domain extends Domain = Domain> = {
    domain: domain
    value?: inferDomain<domain>
    instance?: domain extends object ? constructor : never
}

export class BaseNode<domain extends Domain = Domain> extends RuleNode<
    "base",
    BaseRule<domain>
> {
    readonly kind = "base"

    compare(base: BaseRule, s: ComparisonState): Comparison<BaseRule> {
        return this.rule.domain
            ? s.equality(this)
            : s.disjoint("domain", this.rule, base.rule)
    }

    compile(c: Compilation) {
        return this.rule.domain === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.rule.domain === "null" || this.rule.domain === "undefined"
            ? `${c.data} === ${this.rule}`
            : `typeof ${c.data} === "${this.rule}"`
    }
}
