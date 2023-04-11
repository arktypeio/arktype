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

    static intersection(l: InstanceNode, r: InstanceNode, s: ComparisonState) {
        return constructorExtends(l.child, r.child)
            ? l
            : constructorExtends(r.child, l.child)
            ? r
            : s.addDisjoint("class", l, r)
    }

    static compile(ancestor: constructor, s: CompilationState) {
        const compiled = // TODO: also for other builtins
            ancestor === Array
                ? "Array"
                : registerConstructor(ancestor.name, ancestor)
        return s.check("instance", `${s.data} instanceof ${compiled}`, ancestor)
    }
}
