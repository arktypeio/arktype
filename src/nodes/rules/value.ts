import type { Domain, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive } from "../../utils/serialize.ts"
import type { Compilation } from "../compile.ts"
import type { ComparisonState } from "../compose.ts"
import { registerValue } from "../registry.ts"
import { RuleNode } from "./rule.ts"

export class EqualityRule<
    domain extends Domain = Domain
> extends RuleNode<"value"> {
    constructor(public value: inferDomain<domain>) {
        const id =
            hasDomain(value, "object") || typeof value === "symbol"
                ? registerValue(typeof value, value)
                : serializePrimitive(value as SerializablePrimitive)
        super("value", id)
    }

    intersect(other: EqualityRule, s: ComparisonState) {
        return this.value === other.value
            ? this
            : s.addDisjoint("value", this.value, other.value)
    }

    compile(c: Compilation) {
        return c.check("value", `data === ${this.id}`, this.value)
    }
}
