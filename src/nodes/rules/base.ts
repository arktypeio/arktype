import type { Domain, inferDomain } from "../../utils/domains.ts"
import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"

export class BaseNode<domain extends Domain = Domain> {
    readonly kind = "base"

    constructor(public domain: Domain, public value?: inferDomain<domain>) {}

    compare(base: BaseNode, s: ComparisonState): Comparison<BaseNode> {
        if (this.value !== undefined) {
            if (base.value !== undefined) {
                if (this.value !== base.value) {
                    return s.disjoint("value", this.value, base.value)
                }
            } else {
                this
            }

            if (value.allows(this.rules.value)) {
                intersection.intersection.value = this.rules.value
                intersection.isSupertype = false
            } else {
                return s.disjoint(
                    "leftAssignability",
                    this.rules.value,
                    value.rules
                )
            }
        }
        if (value.rules.value !== undefined) {
            if (this.allows(value.rules.value)) {
                intersection.intersection.value = value.rules.value
                intersection.isSubtype = false
            } else {
                return s.disjoint(
                    "rightAssignability",
                    this.rules,
                    value.rules.value
                )
            }
        }
        return this.domain === base.domain
            ? s.equality(this)
            : s.disjoint("domain", this.domain, domain)
    }

    compile(c: Compilation) {
        if (hasDomain(this.value, "object") || typeof this.value === "symbol") {
            return c.check(
                "value",
                `data === ${registerValue(
                    `${c.type.name}${
                        c.path.length ? "_" + c.path.join("_") : ""
                    }`,
                    this.value
                )}`,
                this.value
            )
        }
        return c.check(
            "value",
            `data === ${serializePrimitive(
                this.value as SerializablePrimitive
            )}`,
            this.value as {}
        )
    }

    compile(c: Compilation) {
        return this.rule.domain === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.rule.domain === "null" || this.rule.domain === "undefined"
            ? `${c.data} === ${this.rule}`
            : `typeof ${c.data} === "${this.domain}"`
    }
}
