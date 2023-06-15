import { registry } from "../../../compile/registry.js"
import { cached } from "../../../utils/functions.js"
import type { AbstractableConstructor } from "../../../utils/objectKinds.js"
import {
    constructorExtends,
    getExactBuiltinConstructorName,
    prototypeKeysOf
} from "../../../utils/objectKinds.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ClassNode extends BasisNode<AbstractableConstructor> {
    extendsOneOf: (...baseConstructors: AbstractableConstructor[]) => boolean
}

export const classNode = defineNodeKind<ClassNode>(
    {
        kind: "class",
        parse: (input) => input,
        compile: (rule, s) =>
            s.check(
                "class",
                rule,
                `${s.data} instanceof ${
                    getExactBuiltinConstructorName(rule) ??
                    registry().register("constructor", rule.name, rule)
                }`
            ),
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

export const arrayClassNode = cached(() => classNode(Array))
