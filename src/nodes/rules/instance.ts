import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { registerConstructor } from "../registry.ts"

export class InstanceNode extends Node<InstanceNode, constructor> {
    serialize(): string {
        return this.definition === Array
            ? "Array"
            : registerConstructor(this.definition.name, this.definition)
    }

    intersect(other: InstanceNode, s: ComparisonState) {
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
