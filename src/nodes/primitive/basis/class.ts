import type { AbstractableConstructor } from "../../../../dev/utils/src/main.js"
import {
    cached,
    constructorExtends,
    getExactBuiltinConstructorName,
    objectKindDescriptions,
    prototypeKeysOf
} from "../../../../dev/utils/src/main.js"
import { registry } from "../../../compile/registry.js"
import { node } from "../../../main.js"
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
                    registry().register(rule)
                }`
            ),
        intersect: intersectBases
    },
    (base) => {
        const literalKeys = prototypeKeysOf(base.rule.prototype)
        const possibleObjectKind = getExactBuiltinConstructorName(base.rule)
        const description = possibleObjectKind
            ? objectKindDescriptions[possibleObjectKind]
            : `an instance of ${base.rule.name}`
        return {
            domain: "object",
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            extendsOneOf: (...baseConstructors: AbstractableConstructor[]) =>
                baseConstructors.some((ctor) =>
                    constructorExtends(base.rule, ctor)
                ),
            description
        }
    }
)

export const arrayClassNode = cached(() => classNode(Array))
