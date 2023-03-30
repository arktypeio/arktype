import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { registerConstructor } from "../registry.ts"
import { Rule } from "./rule.ts"

export class InstanceRule extends Rule<"instance"> {
    constructor(public definition: constructor) {
        super(
            "instance",
            definition === Array
                ? "Array"
                : registerConstructor(definition.name, definition)
        )
    }

    intersect(other: InstanceRule, s: ComparisonState) {
        return constructorExtends(this.definition, other.definition)
            ? this
            : constructorExtends(other.definition, this.definition)
            ? other
            : s.addDisjoint("class", this, other)
    }

    compile(c: Compilation) {
        return c.check(
            "instance",
            `${c.data} instanceof ${this.id}`,
            this.definition
        )
    }
}
