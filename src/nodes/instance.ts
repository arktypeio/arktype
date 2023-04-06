import type { constructor } from "../utils/generics.ts"
import { constructorExtends } from "../utils/generics.ts"
import type { ComparisonState, CompilationState } from "./node.ts"
import { Node } from "./node.ts"
import { registerConstructor } from "./registry.ts"

export class InstanceNode<rule extends constructor = constructor> extends Node<
    typeof InstanceNode
> {
    constructor(rule: rule) {
        super(InstanceNode, rule)
    }

    static intersection(l: InstanceNode, r: InstanceNode, s: ComparisonState) {
        return constructorExtends(l.rule, r.rule)
            ? l
            : constructorExtends(r.rule, l.rule)
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
