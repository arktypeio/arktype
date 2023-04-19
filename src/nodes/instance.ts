import type { constructor } from "../utils/generics.js"
import { constructorExtends } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { ComparisonState, CompiledAssertion, Disjoint } from "./node.js"
import { Node } from "./node.js"

export class InstanceNode<
    ancestor extends constructor = constructor
> extends Node<typeof InstanceNode> {
    readonly kind = "instance"

    constructor(public ancestor: ancestor) {
        super(InstanceNode, ancestor)
    }

    intersect(
        other: InstanceNode,
        s: ComparisonState
    ): InstanceNode | Disjoint {
        return constructorExtends(this.ancestor, other.ancestor)
            ? this
            : constructorExtends(other.ancestor, this.ancestor)
            ? other
            : s.addDisjoint("class", this, other)
    }

    static compile(ancestor: constructor): CompiledAssertion {
        // TODO: also for other builtins
        return `data instanceof ${
            ancestor === Array
                ? "Array"
                : registry().register(ancestor.name, ancestor)
        }`
    }
}
