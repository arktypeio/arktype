import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { ComparisonState, Compilation } from "../node.ts"
import { Node } from "../node.ts"
import { registerConstructor } from "../registry.ts"

export class InstanceNode extends Node<InstanceNode> {
    constructor(public readonly children: constructor) {
        const id = // TODO: also for other builtins
            children === Array
                ? "Array"
                : registerConstructor(children.name, children)
        super(id)
    }

    intersect(other: InstanceNode, s: ComparisonState) {
        return constructorExtends(this.children, other.children)
            ? this
            : constructorExtends(other.children, this.children)
            ? other
            : s.addDisjoint("class", this, other)
    }

    compile(c: Compilation) {
        return c.check(
            "instance",
            `${c.data} instanceof ${this.id}`,
            this.children
        )
    }
}
