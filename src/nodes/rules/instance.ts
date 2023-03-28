import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { registerConstructor } from "../registry.ts"
import { RuleNode } from "./rule.ts"

export class InstanceRule extends RuleNode<"instance"> {
    constructor(public instanceOf: constructor) {
        super(
            "instance",
            instanceOf === Array
                ? "Array"
                : registerConstructor(instanceOf.name, instanceOf)
        )
    }

    intersect(other: InstanceRule, s: ComparisonState) {
        return constructorExtends(this.instanceOf, other.instanceOf)
            ? this
            : constructorExtends(other.instanceOf, this.instanceOf)
            ? other
            : s.addDisjoint("class", this, other)
    }

    compile(c: Compilation) {
        return c.check(
            "instance",
            `${c.data} instanceof ${this.id}`,
            this.instanceOf
        )
    }
}
