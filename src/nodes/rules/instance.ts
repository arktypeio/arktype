import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { ComparisonState } from "../compose.ts"
import { registerConstructor } from "../registry.ts"
import { RuleNode } from "./rule.ts"

export class InstanceRule extends RuleNode<"instance", constructor> {
    readonly kind = "instance"

    intersectRule(other: constructor, s: ComparisonState) {
        return constructorExtends(this.rule, other)
            ? this.rule
            : constructorExtends(other, this.rule)
            ? other
            : s.addDisjoint("class", this.rule, other)
    }

    serialize() {
        return registerConstructor(this.rule.name, this.rule)
    }

    compile(c: Compilation) {
        if (this.rule === Array) {
            return c.check("instance", `Array.isArray(${c.data})`, Array)
        }
        return c.check(
            "instance",
            `${c.data} instanceof ${this.key}`,
            this.rule
        )
    }
}
