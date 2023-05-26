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

export class ClassNode
    extends BaseNode<typeof ClassNode>
    implements BasisDefinition
{
    static readonly kind = "basis"

    static compile(rule: AbstractableConstructor) {
        return [
            `${In} instanceof ${
                getExactBuiltinConstructorName(rule) ??
                registry().register(rule.name, rule)
            }`
        ]
    }

    get domain() {
        return "object" as const
    }

    get level() {
        return "class" as const
    }

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
