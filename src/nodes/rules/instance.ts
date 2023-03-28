import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { ComparisonState } from "../compose.ts"
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
            : s.addDisjoint("class", this.instanceOf, other.instanceOf)
    }

    compile(c: Compilation) {
        return c.check(
            "instance",
            `${c.data} instanceof ${this.id}`,
            this.instanceOf
        )
    }
}
