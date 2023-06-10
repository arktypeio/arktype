import { In } from "../../compile/compile.js"
import { registry } from "../../compile/registry.js"
import type { AbstractableConstructor } from "../../utils/objectKinds.js"
import {
    constructorExtends,
    getExactBuiltinConstructorName,
    prototypeKeysOf
} from "../../utils/objectKinds.js"
import { defineNodeKind } from "../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ClassNode
    extends BasisNode<{
        kind: "class"
        rule: AbstractableConstructor
    }> {
    extendsOneOf: (...baseConstructors: AbstractableConstructor[]) => boolean
}

export const ClassNode = defineNodeKind<ClassNode>(
    {
        kind: "class",
        compile: (rule) =>
            `${In} instanceof ${
                getExactBuiltinConstructorName(rule) ??
                registry().register(rule.name, rule)
            }`,
        intersect: intersectBases
    },
    (base) => ({
        domain: "object",
        literalKeys: prototypeKeysOf(base.rule.prototype),
        extendsOneOf: (...baseConstructors: AbstractableConstructor[]) =>
            baseConstructors.some((ctor) =>
                constructorExtends(base.rule, ctor)
            ),
        description: base.rule.name
    })
)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("class", this.child))
// }
