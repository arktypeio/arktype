import type { constructor } from "../../utils/generics.ts"
import { constructorExtends } from "../../utils/generics.ts"
import type { ComparisonState, CompilationState } from "../node.ts"
import { Node } from "../node.ts"
import { registerConstructor } from "../registry.ts"

export class InstanceNode extends Node<typeof InstanceNode> {
    constructor(public readonly ancestor: constructor) {
        super(InstanceNode, ancestor)
    }

    static intersect(l: InstanceNode, r: InstanceNode, s: ComparisonState) {
        return constructorExtends(l.ancestor, r.ancestor)
            ? l
            : constructorExtends(r.ancestor, l.ancestor)
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
