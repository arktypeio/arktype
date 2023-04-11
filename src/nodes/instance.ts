import type { constructor } from "../utils/generics.js"
import { constructorExtends } from "../utils/generics.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Node } from "./node.js"
import { registerConstructor } from "./registry.js"

export class InstanceNode<rule extends constructor = constructor> extends Node<
    typeof InstanceNode
> {
    constructor(rule: rule) {
        super(InstanceNode, rule)
    }

    and(other: InstanceNode, s: ComparisonState) {
        return constructorExtends(this.child, other.child)
            ? this
            : constructorExtends(other.child, this.child)
            ? other
            : s.addDisjoint("class", this, other)
    }

    static compile(ancestor: constructor, s: CompilationState) {
        const compiled = // TODO: also for other builtins
            ancestor === Array
                ? "Array"
                : registerConstructor(ancestor.name, ancestor)
        return s.check("instance", `${s.data} instanceof ${compiled}`, ancestor)
    }
}
