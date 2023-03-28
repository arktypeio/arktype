import { Domain, hasDomain, inferDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive } from "../../utils/serialize.ts"
import type { Compilation } from "../compile.ts"
import type { Comparison, ComparisonState } from "../compose.ts"
import { registerValue } from "../registry.ts"
import { RuleNode } from "./rule.ts"

export class ValueNode extends RuleNode<"value"> {
    readonly kind = "value"

    intersectRule(rule: unknown, s: ComparisonState): Comparison<unknown> {
        return this.rule === rule
            ? s.equality(rule)
            : s.addDisjoint("value", this.rule, rule)
    }

    compile(c: Compilation) {
        if (hasDomain(this.rule, "object") || typeof this.rule === "symbol") {
            return c.check(
                "value",
                `data === ${registerValue(
                    `${c.type.name}${
                        c.path.length ? "_" + c.path.join("_") : ""
                    }`,
                    this.rule
                )}`,
                this.rule
            )
        }
        return c.check(
            "value",
            `data === ${serializePrimitive(
                this.rule as SerializablePrimitive
            )}`,
            this.rule as {}
        )
    }
}
