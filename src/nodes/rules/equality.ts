import type { Domain, inferDomain } from "../../utils/domains.ts"
import { hasDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive } from "../../utils/serialize.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { registerValue } from "../registry.ts"

export class EqualityRule<domain extends Domain = any> extends Node<
    EqualityRule<domain>,
    inferDomain<domain>
> {
    serialize() {
        return hasDomain(this.definition, "object") ||
            typeof this.definition === "symbol"
            ? registerValue(typeof this.definition, this.definition)
            : serializePrimitive(this.definition as SerializablePrimitive)
    }

    intersect(other: EqualityRule, s: ComparisonState) {
        return this === other ? this : s.addDisjoint("value", this, other)
    }

    compile(c: Compilation) {
        return c.check("value", `data === ${this.id}`, this.definition)
    }
}
