import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import {
    constructorExtends,
    getExactBuiltinConstructorName,
    prototypeKeysOf
} from "../../utils/objectKinds.js"
import { In } from "../compilation.js"
import { BaseNode } from "../node.js"

import { registry } from "../registry.js"
import type { BasisDefinition, BasisInstance } from "./basis.js"
import { intersectBases } from "./basis.js"

export class ClassNode extends BaseNode<"basis"> implements BasisDefinition {
    constructor(public rule: AbstractableConstructor) {
        const condition = `${In} instanceof ${
            getExactBuiltinConstructorName(rule) ??
            registry().register(rule.name, rule)
        }`
        return (
            (BaseNode.nodes.basis[condition] as ClassNode) ??
            super("basis", condition)
        )
    }

    readonly domain = "object"

    readonly level = "class"

    extendsOneOf(...baseConstructors: AbstractableConstructor[]) {
        return baseConstructors.some((base) =>
            constructorExtends(this.rule, base)
        )
    }

    computeIntersection(other: BasisInstance) {
        return intersectBases(this, other)
    }

    literalKeysOf() {
        return prototypeKeysOf(this.rule.prototype)
    }

    toString() {
        return this.rule.name
    }
}

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("class", this.child))
// }
