import type { Domain, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive } from "../../utils/serialize.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { registerValue } from "../registry.ts"
import { Rule } from "./rule.ts"

export class EqualityRule<
    domain extends Domain = any
> extends Rule<"equality"> {
    constructor(public definition: inferDomain<domain>) {
        const id =
            hasDomain(definition, "object") || typeof definition === "symbol"
                ? registerValue(typeof definition, definition)
                : serializePrimitive(definition as SerializablePrimitive)
        super("equality", id)
    }

    intersect(other: EqualityRule, s: ComparisonState) {
        return this === other ? this : s.addDisjoint("value", this, other)
    }

    compile(c: Compilation) {
        return c.check("value", `data === ${this.id}`, this.definition)
    }
}
