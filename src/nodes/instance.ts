import type { constructor } from "../utils/generics.js"
import { constructorExtends } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { ComparisonState, CompilationState, Disjoint } from "./node.js"
import { Node } from "./node.js"

export class InstanceNode<rule extends constructor = constructor> extends Node<
    typeof InstanceNode
> {
    constructor(rule: rule) {
        super(InstanceNode, rule)
    }

    intersect(
        other: InstanceNode,
        s: ComparisonState
    ): InstanceNode | Disjoint {
        return constructorExtends(this.child, other.child)
            ? this
            : constructorExtends(other.child, this.child)
            ? other
            : s.addDisjoint("class", this, other)
    }

    static compile(ancestor: constructor, s: CompilationState) {
        // TODO: also for other builtins
        return [
            `${s.data} instanceof ${
                ancestor === Array
                    ? "Array"
                    : registry().register(ancestor.name, ancestor)
            }`
        ]
        // return s.check("instance", `${s.data} instanceof ${compiled}`, ancestor)
    }
}
