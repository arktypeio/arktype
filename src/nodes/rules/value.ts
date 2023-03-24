import { hasDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive } from "../../utils/serialize.ts"
import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"
import { registerValue } from "../registry.ts"

export class ValueNode {
    constructor(public value: unknown) {}

    intersect(r: ValueNode, s: ComparisonState): Comparison<ValueNode> {
        return this.value === r.value
            ? s.equality(this)
            : s.disjoint("value", this.value, r.value)
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
}
