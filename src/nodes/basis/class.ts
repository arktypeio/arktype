import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import {
    getExactBuiltinConstructorName,
    prototypeKeysOf
} from "../../utils/objectKinds.js"
import { In } from "../compilation.js"
import { BaseNode } from "../node.js"
import type { ConstraintKind } from "../predicate.js"

import { registry } from "../registry.js"
import type { BasisDefinition, BasisInstance } from "./basis.js"
import { assertAllowsConstraint, intersectBases } from "./basis.js"

export class ClassNode
    extends BaseNode<typeof ClassNode>
    implements BasisDefinition
{
    static readonly kind = "basis"
    readonly domain = "object"
    readonly level = "class"

    static compile(rule: AbstractableConstructor) {
        return [
            `${In} instanceof ${
                getExactBuiltinConstructorName(rule) ??
                registry().register(rule.name, rule)
            }`
        ]
    }

    assertAllowsConstraint(kind: ConstraintKind) {
        assertAllowsConstraint(this, kind)
    }

    computeIntersection(other: BasisInstance) {
        return intersectBases(this, other)
    }

    literalKeysOf() {
        return prototypeKeysOf(this.rule.prototype)
    }

    describe() {
        return this.rule.name
    }
}

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("class", this.child))
// }
